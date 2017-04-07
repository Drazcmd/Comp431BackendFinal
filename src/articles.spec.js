/*
 * Test suite for articles.js
 */
const expect = require('chai').expect
const fetch = require('isomorphic-fetch')

const url = path => `http://localhost:3000${path}`

//these three functions are taken from provided sample!
const getArticles = (oldArticles) => get('/articles').then(r => {
    const a = r.articles
    if (!a || a.length < 3) {
        const msg = `FAIL: Expected at least 3 articles from GET /articles but found ${a.length}`
        console.error(msg)
    } else {
        console.log(`OK: GET /articles returned ${a.length} articles, expecting at least 3`)
    }
    if (oldArticles) {
        if (oldArticles.length != a.length - 1) {
            const msg = `FAIL: expected one new article added by found ${oldArticles.length} + 1 = ${a.length}`
            console.error(msg)
            throw new Error(msg)
        } else {
            console.log('OK: GET /articles returned one additional article')
        }
    }
    return a
})
const checkText = (text) => r => {
    if (r.articles) { r = r.articles }
    if (Array.isArray(r)) {
        if (r.length != 1) {
            const msg = `FAIL: Expected 1 new article added but found ${r.length} articles`
            console.error(msg)
            throw new Error(msg)
        }
        r = r[0]
    }
    console.log('article ', r)
    if (!r.text) {
        const msg = `FAIL: Expected field "text" in article but found ${JSON.stringify(r)}`
        console.error(msg)
        throw new Error(msg)
    }
    if (r.text !== text) {
        console.error(`FAIL: Article did not have the correct message: ${r.text} vs ${text}`)
    } else {
        console.log(`OK: article text was correct`)
    }
    return r
}

const postNew = (oldArticles) => {
    const payload = { text: 'Hello World!' }
    console.log(`POST /article -d`, payload)
    return fetch(`${config.backend}/article`, {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST'
    })
        .then(checkStatus('article'))
        .then(checkText(payload.text))
        .then(r => {
            const id = r.id || r._id
            return get(`/articles/${id}`)
        })
        .then(checkText(payload.text))
        .then(r => {
            const id = r.id || r._id
            console.log(`OK GET /articles/${id} got the new article correctly`)
        })
        .then(_ => oldArticles)
}
describe('Validate Article functionality', () => {

	it('validates invalid POST /article', (done) => {
		// call POST /articles/id where id is not a valid article id, perhaps 0
		// confirm that you get no results, and that GET doesn't change from before to after
		console.log('')
		done()
	}, 200)
	it('validates valid POST /article', (done) => {
		// call POST /articles/id where id is a valid confirm that you get no results.
		//and that GET doesn't change from before to after
		console.log('')
		done()
	}, 200)

});
