import type { Express, Request, Response } from 'express'
import { openApiSpec } from './openapi'

const SWAGGER_UI_VERSION = '5.17.14'

function swaggerPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ShareList API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui.css" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/index.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@${SWAGGER_UI_VERSION}/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      persistAuthorization: true,
      displayRequestDuration: true,
    })
  </script>
</body>
</html>`
}

export function mountSwagger(app: Express): void {
  app.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(openApiSpec)
  })

  app.get('/', (_req: Request, res: Response) => {
    res.type('html').send(swaggerPageHtml())
  })
}
