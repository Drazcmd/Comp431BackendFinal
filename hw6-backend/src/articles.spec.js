/*
 * Test suite for articles.js
 */
const expect = require('chai').expect
const fetch = require('isomorphic-fetch')

const url = path => `http://localhost:3000${path}`
//(uses some code from provided sample)
describe('Validate Article functionality', () => {
	it('validates valid POST /article', (done) => {
		// call POST /articles and confirm it adds an article
		const payload = {
			text: "HELLO!!"	
		}
		fetch(url("/articles"))
		.then(res => {
			return res.json()
		})
		.then(body => {
			expect(body.articles.length).to.eql(3)
		})
		.then(
			fetch(url('/article'), {
		        body: JSON.stringify(payload),
		        headers: { 'Content-Type': 'application/json' },
		        method: 'POST'
		    })
			.then(res => {
				return res.json()
			})
			.then(body => {
				expect(body.articles.length).to.eql(1)
				expect(body.articles[0].id).to.eql(4)
			})
			.then(fetch(url("/articles"))
				.then(res => {
					return res.json()
				})
				.then(body => {
					expect(body.articles.length).to.eql(4)
				})
				.then(done)
				.catch(done)
			)
	    )
	}, 200)
});
