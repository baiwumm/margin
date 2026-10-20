<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" doctype-system="about:legacy-compat" />

  <xsl:template name="cnDate">
    <xsl:param name="d" />
    <xsl:variable name="day" select="substring($d, 6, 2)" />
    <xsl:variable name="mon" select="substring($d, 9, 3)" />
    <xsl:variable name="year" select="substring($d, 13, 4)" />
    <xsl:value-of select="$year" />年<xsl:choose><xsl:when test="$mon = 'Jan'">1</xsl:when><xsl:when test="$mon = 'Feb'">2</xsl:when><xsl:when test="$mon = 'Mar'">3</xsl:when><xsl:when test="$mon = 'Apr'">4</xsl:when><xsl:when test="$mon = 'May'">5</xsl:when><xsl:when test="$mon = 'Jun'">6</xsl:when><xsl:when test="$mon = 'Jul'">7</xsl:when><xsl:when test="$mon = 'Aug'">8</xsl:when><xsl:when test="$mon = 'Sep'">9</xsl:when><xsl:when test="$mon = 'Oct'">10</xsl:when><xsl:when test="$mon = 'Nov'">11</xsl:when><xsl:when test="$mon = 'Dec'">12</xsl:when></xsl:choose>月<xsl:value-of select="number($day)" />日
  </xsl:template>

  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title><xsl:value-of select="rss/channel/title" /> · RSS 订阅</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/giscus/fonts/maple-mono-cn/maple-mono-cn.css" />
        <style>
          :root {
            --background: #f5f5f3;
            --foreground: #303036;
            --muted: #e4e4e1;
            --border: #7cadff;
            --accent: #1158d1;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --background: #0b0b0b;
              --foreground: #f6f7f8;
              --muted: #1a1d22;
              --border: #2264e3;
              --accent: #008fec;
            }
          }
          /* 浅色 = 纸上的终端：与站点一致的工程方格纸纹理 */
          @media (prefers-color-scheme: light) {
            body {
              background-image: linear-gradient(rgba(11, 11, 11, 0.018) 1px, transparent 1px),
                linear-gradient(90deg, rgba(11, 11, 11, 0.018) 1px, transparent 1px);
              background-size: 24px 24px;
            }
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: "Maple Mono CN", "Fira Code", "Cascadia Code", Consolas, "Courier New", monospace;
            background: var(--background);
            color: var(--foreground);
            min-height: 100vh;
            line-height: 1.6;
          }
          .aurora {
            position: fixed;
            border-radius: 999px;
            filter: blur(110px);
            pointer-events: none;
            z-index: 0;
          }
          .a1 {
            width: 520px;
            height: 520px;
            top: -160px;
            right: -120px;
            background: radial-gradient(
              circle,
              color-mix(in srgb, var(--accent) 20%, transparent),
              transparent 70%
            );
            opacity: 1;
          }
          .a2 {
            width: 460px;
            height: 460px;
            bottom: -140px;
            left: -120px;
            background: radial-gradient(
              circle,
              color-mix(in srgb, var(--border) 14%, transparent),
              transparent 70%
            );
            opacity: 1;
          }
          .container {
            position: relative;
            z-index: 1;
            max-width: 860px;
            margin: 0 auto;
            padding: 48px 16px 72px;
          }
          @media (min-width: 640px) {
            .container {
              padding: 56px 24px 80px;
            }
          }

          /* ── Hero（与首页同款终端徽章 + shimmer 标题） ── */
          .hero {
            padding: 40px 0 56px;
          }
          @media (min-width: 640px) {
            .hero {
              padding: 56px 0 80px;
            }
          }
          .term-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            padding: 6px 14px;
            border: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
            background: color-mix(in srgb, var(--muted) 20%, transparent);
            border-radius: 999px;
            font-size: 12px;
          }
          @media (min-width: 640px) {
            .term-badge {
              font-size: 14px;
            }
          }
          .dot-wrap {
            position: relative;
            display: inline-flex;
            width: 8px;
            height: 8px;
          }
          .ping {
            position: absolute;
            inset: 0;
            border-radius: 999px;
            background: var(--accent);
            opacity: 0.6;
            animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
          }
          .dot {
            position: relative;
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: var(--accent);
          }
          @keyframes ping {
            75%,
            100% {
              transform: scale(2);
              opacity: 0;
            }
          }
          .prefix {
            color: var(--accent);
          }
          .path {
            color: var(--foreground);
          }
          .suffix {
            opacity: 0.4;
          }
          .hero-title {
            font-size: 48px;
            line-height: 1.3;
            font-weight: 700;
            letter-spacing: -0.025em;
            background: linear-gradient(
              135deg,
              var(--accent) 0%,
              color-mix(in oklab, var(--accent) 50%, var(--foreground)) 20%,
              var(--foreground) 35%,
              var(--foreground) 65%,
              color-mix(in oklab, var(--accent) 50%, var(--foreground)) 80%,
              var(--accent) 100%
            );
            background-size: 250% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 6s ease-in-out infinite;
          }
          @media (min-width: 640px) {
            .hero-title {
              font-size: 60px;
            }
          }
          @media (min-width: 1024px) {
            .hero-title {
              font-size: 72px;
            }
          }
          @keyframes shimmer {
            0%,
            100% {
              background-position: 0% center;
            }
            50% {
              background-position: 100% center;
            }
          }
          .hero-desc {
            max-width: 36rem;
            margin-top: 28px;
            font-size: 16px;
            line-height: 1.7;
            opacity: 0.75;
          }
          @media (min-width: 640px) {
            .hero-desc {
              font-size: 18px;
            }
          }
          .site-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 24px;
            padding: 10px 20px;
            border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
            background: color-mix(in srgb, var(--accent) 10%, transparent);
            border-radius: 8px;
            color: var(--accent);
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            transition: border-color 0.3s, background-color 0.3s, box-shadow 0.3s, transform 0.3s;
          }
          .site-btn:hover {
            border-color: var(--accent);
            background: color-mix(in srgb, var(--accent) 20%, transparent);
            box-shadow: 0 10px 20px -6px color-mix(in srgb, var(--accent) 20%, transparent);
            transform: translateY(-2px);
          }

          /* ── Section 标题（同首页 Featured / Recent） ── */
          .section-head {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
          }
          .section-head h2 {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--accent);
          }
          .divider {
            height: 1px;
            flex: 1;
            background: color-mix(in srgb, var(--border) 20%, transparent);
          }
          .count {
            font-family: "Fira Code", "Cascadia Code", Consolas, monospace;
            font-size: 12px;
            color: color-mix(in srgb, var(--accent) 40%, transparent);
            user-select: none;
          }

          /* ── 文章卡片（同首页 Card） ── */
          .feed {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .card {
            position: relative;
            border-radius: 16px;
            border: 1px solid color-mix(in srgb, var(--border) 25%, transparent);
            background: color-mix(in srgb, var(--muted) 10%, transparent);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            transition: border-color 0.3s ease-out, background-color 0.3s ease-out, box-shadow 0.3s ease-out, transform 0.3s ease-out;
          }
          .card:hover {
            transform: translateY(-2px);
            border-color: color-mix(in srgb, var(--accent) 40%, transparent);
            background: color-mix(in srgb, var(--accent) 5%, transparent);
            box-shadow:
              0 10px 15px -3px color-mix(in srgb, var(--accent) 10%, transparent),
              0 4px 6px -4px color-mix(in srgb, var(--accent) 10%, transparent);
          }
          .glow {
            position: absolute;
            inset: 0;
            border-radius: 16px;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
            background: radial-gradient(
              350px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
              color-mix(in oklab, var(--accent) 8%, transparent) 0%,
              color-mix(in oklab, var(--accent) 4%, transparent) 30%,
              color-mix(in oklab, var(--accent) 0.8%, transparent) 60%,
              transparent 80%
            );
          }
          .card:hover .glow {
            opacity: 1;
          }
          .card-body {
            position: relative;
            padding: 16px;
          }
          @media (min-width: 640px) {
            .card-body {
              padding: 20px;
            }
          }
          .card-title {
            font-size: 18px;
            font-weight: 600;
          }
          .card-title a {
            color: var(--foreground);
            text-decoration: none;
            transition: color 0.2s;
          }
          .card-title a:hover {
            color: var(--accent);
          }
          .meta {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 6px;
            color: color-mix(in srgb, var(--foreground) 80%, transparent);
            font-size: 14px;
          }
          .meta svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
          }
          .excerpt {
            margin-top: 8px;
            font-size: 14px;
            line-height: 1.625;
            color: color-mix(in srgb, var(--foreground) 75%, transparent);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-top: 12px;
            list-style: none;
          }
          .tag {
            display: inline-flex;
            align-items: center;
            gap: 2px;
            padding: 2px 10px;
            border: 1px solid color-mix(in srgb, var(--border) 30%, transparent);
            background: color-mix(in srgb, var(--muted) 15%, transparent);
            border-radius: 999px;
            font-size: 12px;
            font-weight: 500;
            color: color-mix(in srgb, var(--foreground) 60%, transparent);
          }
          .hash {
            opacity: 0.6;
          }
          .footer {
            margin-top: 48px;
            text-align: center;
            font-size: 12px;
            letter-spacing: 0.1em;
            color: color-mix(in srgb, var(--foreground) 60%, transparent);
          }
          .footer a {
            color: var(--accent);
            text-decoration: none;
          }
          .footer a:hover {
            text-decoration: underline;
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-title,
            .ping {
              animation: none;
            }
            .card,
            .site-btn {
              transition: none;
            }
            .glow {
              background: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="aurora a1"></div>
        <div class="aurora a2"></div>

        <main class="container">
          <header class="hero">
            <div class="term-badge">
              <span class="dot-wrap" aria-hidden="true">
                <span class="ping"></span>
                <span class="dot"></span>
              </span>
              <span class="prefix">~</span>
              <span class="path">/rss.xml</span>
              <span class="suffix">$</span>
            </div>
            <h1 class="hero-title"><xsl:value-of select="rss/channel/title" /></h1>
            <p class="hero-desc"><xsl:value-of select="rss/channel/description" /></p>
            <a class="site-btn" href="{rss/channel/link}">访问网站</a>
          </header>

          <div class="section-head">
            <h2>最新内容</h2>
            <div class="divider" aria-hidden="true"></div>
            <span class="count">[<xsl:value-of select="count(rss/channel/item)" />/<xsl:value-of select="count(rss/channel/item)" />]</span>
          </div>

          <section class="feed">
            <xsl:for-each select="rss/channel/item">
              <article class="card">
                <div class="glow" aria-hidden="true"></div>
                <div class="card-body">
                  <h3 class="card-title">
                    <a href="{link}"><xsl:value-of select="title" /></a>
                  </h3>
                  <div class="meta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <time>
                      <xsl:call-template name="cnDate">
                        <xsl:with-param name="d" select="pubDate" />
                      </xsl:call-template>
                    </time>
                  </div>
                  <p class="excerpt"><xsl:value-of select="description" /></p>
                  <xsl:if test="count(category) &gt; 0">
                    <ul class="tags">
                      <xsl:for-each select="category[position() &lt;= 4]">
                        <li>
                          <span class="tag">
                            <span class="hash" aria-hidden="true">#</span>
                            <xsl:value-of select="." />
                          </span>
                        </li>
                      </xsl:for-each>
                    </ul>
                  </xsl:if>
                </div>
              </article>
            </xsl:for-each>
          </section>

          <footer class="footer">
            由 <a href="{rss/channel/link}"><xsl:value-of select="rss/channel/title" /></a> 提供 · 通过 RSS 订阅
          </footer>
        </main>

        <script>
          document.querySelectorAll(".card").forEach((card) =&gt; {
            card.addEventListener("mousemove", (e) =&gt; {
              const rect = card.getBoundingClientRect();
              card.style.setProperty("--mouse-x", e.clientX - rect.left + "px");
              card.style.setProperty("--mouse-y", e.clientY - rect.top + "px");
            });
          });
        </script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
