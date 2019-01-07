import moduleAlias from 'module-alias'
import path from 'path'
import fs from 'fs-extra-promise'

moduleAlias.addAliases({
  src: __dirname,
})

import { scrapArticles, Article } from './service'

const sortArticlesByClaps = (articles: Article[]) => {
  return articles.sort((fArticle, sArticle) => sArticle.claps - fArticle.claps)
}

const createHTMLRepresentation = (articles: Article[]) => {
  const list = articles
    .map((article) => {
      return `
        <li>
          <a href="${article.articleUrl}">${article.articleTitle}</a> by
          <a href="${article.authorUrl}">${article.authorName}</a>
          [${article.minRead}] (${article.claps})
        </li>
      `
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="X-UA-Compatible" content="ie=edge" />
        <title>Articles</title>
      </head>
      <body>
        <ol>
          ${list}
        </ol>
      </body>
    </html>
  `
}

const scrap = async () => {
  const jsonFilepath = path.join(__dirname, '../articles.json')
  const htmlFilepath = path.join(__dirname, '../articles.html')

  await Promise.all([
    fs.ensureFile(jsonFilepath, () => true),
    fs.writeFileAsync(jsonFilepath, ''),
    fs.ensureFile(htmlFilepath, () => true),
    fs.writeFileAsync(htmlFilepath, ''),
  ])

  const scrapedArticles = await scrapArticles()
  const articles = sortArticlesByClaps(scrapedArticles)

  console.log(`Scrapped ${articles.length} articles.`)

  const jsonRepresentation = JSON.stringify(articles)
  const htmlRepresentation = createHTMLRepresentation(articles)

  await Promise.all([
    fs.writeFileAsync(jsonFilepath, jsonRepresentation),
    fs.writeFileAsync(htmlFilepath, htmlRepresentation),
  ])
}

scrap()
