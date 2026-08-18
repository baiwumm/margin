/**
 * 构建期从 GitHub GraphQL API 拉取用户一整年的贡献日历（Projects 页面使用）。
 *
 * 策略（与 projectStats.ts 的 stars / forks 完全一致）：
 * - 复用私有环境变量 `GITHUB_TOKEN`，构建时向 GraphQL 端点请求一次
 *   `contributionsCollection.contributionCalendar`（REST API 不提供贡献日历）；
 * - 账号从 `PUBLIC_SOCIAL_GITHUB` 解析，缺失时回退到项目仓库 owner；
 * - 日期范围对齐 GitHub 官方日历：从 52 周前的周日到今天（53 列 × 7 行），
 *   未来日期以 null 占位；
 * - 无 Token / 请求失败 / 响应异常时返回 null，调用方隐藏整个区块，构建不中断；
 * - Token 为私有变量，绝不能带 `PUBLIC_` 前缀（否则会打进客户端产物）。
 */
import { projects } from "@/data/projects";

export type ContributionDay = {
  /** YYYY-MM-DD（UTC，与 GitHub 一致） */
  date: string;
  /** 当日贡献数 */
  count: number;
  /** 0-4 强度等级（NONE → 0，FIRST..FOURTH_QUARTILE → 1..4） */
  level: 0 | 1 | 2 | 3 | 4;
};

export type ContributionCalendarData = {
  /** GitHub 账号 */
  login: string;
  /** 过去一年贡献总数 */
  totalContributions: number;
  /** 53 列（周）× 7 行（日），未来日期为 null */
  weeks: Array<Array<ContributionDay | null>>;
  /** 月份标签：{ 标签, 所在列索引 } */
  monthLabels: Array<{ label: string; column: number }>;
};

const LEVEL_MAP: Record<string, ContributionDay["level"]> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

type GraphQLResponse = {
  data?: {
    user?: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number;
          weeks: Array<{
            contributionDays: Array<{
              date: string;
              contributionCount: number;
              contributionLevel: string;
            }>;
          }>;
        };
      };
    };
  };
};

/**
 * Env helper: prefer real process.env (platform env vars), fall back to
 * import.meta.env so values from the project's .env file also work.
 * Astro dev 模式只把 .env 注入 import.meta.env，构建时两者都可能存在。
 */
const getEnv = (key: string): string => {
  const procValue = process.env[key];
  if (procValue) return procValue;
  try {
    const metaValue = (import.meta.env as Record<string, unknown>)[key];
    return typeof metaValue === "string" ? metaValue : "";
  } catch {
    return "";
  }
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const toISODate = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** 解析 GitHub 链接（个人主页或仓库 URL）中的账号。 */
const parseLogin = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    return parts[0] ? parts[0] : null;
  } catch {
    return null;
  }
};

/** 账号解析：PUBLIC_SOCIAL_GITHUB 优先，回退到项目仓库 owner。 */
const resolveLogin = (): string | null => {
  const profile = parseLogin(getEnv("PUBLIC_SOCIAL_GITHUB"));
  if (profile) return profile;
  const repoUrl = projects
    .map(({ repoUrl }) => repoUrl)
    .find((url): url is string => Boolean(url));
  return repoUrl ? parseLogin(repoUrl) : null;
};

/**
 * 构建 53 周对齐的日期范围：结束为今天，起始为 52 周前所在周的周日（UTC），
 * 与 GitHub 官方贡献日历的列结构一致。
 */
const buildDateRange = (): { from: Date; today: Date; weekCount: number } => {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const from = addDays(today, -364); // 52 周前
  from.setUTCDate(from.getUTCDate() - from.getUTCDay()); // 对齐到周日
  const weekCount =
    Math.floor((today.getTime() - from.getTime()) / 86_400_000 / 7) + 1;
  return { from, today, weekCount };
};

const fetchContributionCalendar = async (
  login: string
): Promise<GraphQLResponse["data"] | null> => {
  const token = getEnv("GITHUB_TOKEN");
  if (!token) return null;

  const now = new Date();
  const { from } = buildDateRange();
  const query = `query ($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
    }
  }
}`;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "margin-blog",
    },
    body: JSON.stringify({
      query,
      variables: {
        login,
        from: from.toISOString(),
        to: now.toISOString(),
      },
    }),
  });
  if (!response.ok) return null;

  const json = (await response.json()) as GraphQLResponse;
  if (!json.data?.user?.contributionsCollection?.contributionCalendar) {
    return null;
  }
  return json.data;
};

/** 返回用户一整年贡献日历；无 Token / 解析失败 / 网络异常时返回 null。 */
export const getContributionCalendar = async (): Promise<ContributionCalendarData | null> => {
  const login = resolveLogin();
  if (!login) return null;

  try {
    const data = await fetchContributionCalendar(login);
    if (!data) return null;

    const { from, today, weekCount } = buildDateRange();
    const calendar = data.user?.contributionsCollection.contributionCalendar;
    if (!calendar) return null;
    const rawWeeks = calendar.weeks;

    const weeks: Array<Array<ContributionDay | null>> = [];
    for (let w = 0; w < weekCount; w++) {
      const days: Array<ContributionDay | null> = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(from, w * 7 + d);
        if (date.getTime() > today.getTime()) {
          days.push(null); // 本周未来日期
          continue;
        }
        const iso = toISODate(date);
        const raw = rawWeeks[w]?.contributionDays.find(day => day.date === iso);
        if (!raw) {
          days.push(null);
          continue;
        }
        days.push({
          date: iso,
          count: raw.contributionCount,
          level: LEVEL_MAP[raw.contributionLevel] ?? 0,
        });
      }
      weeks.push(days);
    }

    const monthLabels: Array<{ label: string; column: number }> = [];
    for (let w = 0; w < weekCount; w++) {
      const firstDay = addDays(from, w * 7);
      const month = firstDay.getUTCMonth();
      if (w === 0 || month !== addDays(from, (w - 1) * 7).getUTCMonth()) {
        monthLabels.push({ label: `${month + 1}月`, column: w });
      }
    }

    return {
      login,
      totalContributions: calendar.totalContributions,
      weeks,
      monthLabels,
    };
  } catch {
    return null; // 网络异常回退，构建不中断
  }
};
