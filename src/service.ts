import puppeteer from 'puppeteer'

interface Article {
  articleUrl: string
  date: string
  claps: number
  articleTitle: string
  authorName: string
  authorUrl: string
  minRead: string
}

const createBrowser = async () => {
  const browser = await puppeteer.launch({ headless: true })

  return async function getPage<T>(url: string, callback: (page: puppeteer.Page) => Promise<T>) {
    const page = await browser.newPage()

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })

      page.on('console', (msg) => console.log(msg.text()))

      const result = await callback(page)

      await page.close()

      return result
    } catch (e) {
      await page.close()

      throw e
    }
  }
}

const scrapArticles = async () => {
  const createPage = await createBrowser()

  return createPage<Article[]>('https://hackernoon.com/tagged/javascript', async (page) => {
    let articles: Article[] = []
    let offset = 0

    while (true) {
      console.log({ offset })

      const scrapedArticles: Article[] = await page.evaluate((offset) => {
        function safeGet<T extends Element, K>(
          element: T,
          callback: (element: T) => K,
          fallbackValue = null,
        ): K {
          if (!element) {
            return fallbackValue
          }

          return callback(element)
        }

        const removeQueryFromURL = (url: string) => url.split('?').shift()

        return Array.from(document.querySelectorAll('.postArticle'))
          .slice(offset)
          .map((post) => {
            try {
              const dateElement = post.querySelector('time')
              const date = safeGet(dateElement, (el) => new Date(el.dateTime).toUTCString(), '')

              const authorDataElement = post.querySelector<HTMLLinkElement>(
                '.postMetaInline-authorLockup a[data-action="show-user-card"]',
              )

              const { authorUrl, authorName } = safeGet(
                authorDataElement,
                (el) => {
                  return {
                    authorUrl: removeQueryFromURL(el.href),
                    authorName: el.textContent,
                  }
                },
                {},
              )

              const clapsElement = post.querySelector('span > button')

              const claps = safeGet(
                clapsElement,
                (el) => {
                  const clapsString = el.textContent

                  if (clapsString.endsWith('K')) {
                    return Number(clapsString.slice(0, -1)) * 1000
                  }

                  return Number(clapsString)
                },
                0,
              )

              const articleTitleElement = post.querySelector('h3')
              const articleTitle = safeGet(articleTitleElement, (el) => el.textContent)

              const articleUrlElement = post.querySelector<HTMLLinkElement>(
                '.postArticle-readMore a',
              )
              const articleUrl = safeGet(articleUrlElement, (el) => removeQueryFromURL(el.href))

              const minReadElement = post.querySelector<HTMLSpanElement>('span[title]')
              const minRead = safeGet(minReadElement, (el) => el.title)

              return {
                claps,
                articleTitle,
                articleUrl,
                date,
                authorUrl,
                authorName,
                minRead,
              } as Article
            } catch (e) {
              console.log(e.message)
              return null
            }
          })
      }, offset)

      offset += scrapedArticles.length

      // scroll to the bottom of the page
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })

      // wait to fetch the new articles
      await page.waitFor(7500)

      const matchingArticles = scrapedArticles.filter((article) => {
        return article && new Date(article.date).getFullYear() >= 2018
      })

      if (!matchingArticles.length) {
        return articles
      }

      const parsedArticles = matchingArticles.filter((article) => {
        return new Date(article.date).getFullYear() === 2018
      })

      articles = [...articles, ...parsedArticles]

      console.log(articles[articles.length - 1])
    }
  })
}

export { scrapArticles, Article }
