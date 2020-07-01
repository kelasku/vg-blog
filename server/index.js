const dev = process.env.NODE_ENV !== 'production'
if (dev) {
  require('dotenv').config()
}
const express = require('express')
const next = require('next')
const { join } = require('path')
const CacheableResponse = require('cacheable-response')
const compression = require('compression')
const helmet = require('helmet')
const cors = require('cors')
const generateSitemap = require('./generateSitemap')

const port = process.env.PORT || 3000
const root = dev ? `http://localhost:${port}` : `https://www.valentingurkov.com:${port}`
const app = next({ dev })
const handle = app.getRequestHandler()

const ssrCache = CacheableResponse({
  ttl: 0, //dev ? 0, : 1000 * 60 * 60, // 1hour
  get: async ({ req, res, pagePath, queryParams }) => ({
    data: await app.renderToHTML(req, res, pagePath, queryParams)
  }),
  send: ({ data, res }) => res.send(data)
})

const whitelist = [
  `http://localhost:${port}`,
  'https://www.valentingurkov.com',
  'https://valentingurkov.com',
  'https://cdn.valentingurkov.com',
  'https:valentingurkov.herokuapp.com'
]
const corsOptions = {
  origin(origin, callback) {
    if (origin === undefined || whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error(`Not allowed by CORS - origin:${origin}`))
    }
  }
}

app
  .prepare()
  .then(() => {
    const server = express()

    server.use(cors(corsOptions))

    server.use(compression())

    server.use(helmet())

    server.use(
      '/public',
      express.static(join(__dirname, '../public'), {
        maxAge: '365d',
        immutable: true
      })
    )

    server.options('*', cors())

    server.get('/privacy-policy', (req, res) => ssrCache({ req, res, pagePath: '/privacy' }))

    server.get('/terms-and-conditions', (req, res) => ssrCache({ req, res, pagePath: '/terms' }))

    server.get('/our-mission', (req, res) => ssrCache({ req, res, pagePath: '/ourMission' }))

    server.get('/articles', (req, res) => ssrCache({ req, res, pagePath: '/articles' }))

    server.get('/articles/:slug', (req, res) => {
      const nextJsPage = '/blogPost'
      const queryParams = { slug: req.params.slug }
      ssrCache({ req, res, pagePath: nextJsPage, queryParams })
    })

    server.get('/sitemap.xml', async (req, res) => {
      const sitemap = await generateSitemap()
      try {
        const xml = sitemap.toXML()
        res.header('Content-Type', 'application/xml')
        res.status(200).send(xml)
      } catch (e) {
        console.error(e)
        res.status(500).end()
      }
    })

    const iconFileOptions = {
      root: join(__dirname, '../public/icons')
    }

    server.get('/browserconfig.xml', (req, res) => res.status(200).sendFile('browserconfig.xml', iconFileOptions))
    server.get('/apple-touch-icon.png', (req, res) => res.status(200).sendFile('apple-touch-icon.png', iconFileOptions))

    server.get('/', (req, res) => ssrCache({ req, res, pagePath: req.url }))

    server.get('*', (req, res) => {
      if (req.url.includes('/service-worker.js')) {
        // Don't cache service worker is a best practice (otherwise clients wont get emergency bug fix)
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        res.set('Content-Type', 'application/javascript')
        const filePath = join(__dirname, '../.next/public', 'service-worker.js')
        app.serveStatic(req, res, filePath)
      } else {
        handle(req, res, req.url)
      }
    })

    server.listen(port, err => {
      if (err) throw err
      console.log(`Ready on ${root}`)
    })
  })
  .catch(ex => {
    console.error(ex.stack)
    throw ex
  })
