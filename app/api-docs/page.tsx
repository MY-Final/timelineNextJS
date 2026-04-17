export default function ApiDocsPage() {
  return (
    <html lang="zh-CN">
      <head>
        <title>Timeline API Docs</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
        <style>{`
          body { margin: 0; }
          .swagger-ui .topbar { background: #1a0a10; }
          .swagger-ui .topbar .download-url-wrapper { display: none; }
        `}</style>
      </head>
      <body>
        <div id="swagger-ui" />
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = function() {
                SwaggerUIBundle({
                  url: "/api/docs",
                  dom_id: '#swagger-ui',
                  presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
                  layout: "BaseLayout",
                  deepLinking: true,
                  withCredentials: true,
                });
              };
            `,
          }}
        />
      </body>
    </html>
  );
}
