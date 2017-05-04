/*
 * Test suite for profile.js
 */
const expect = require('chai').expect
const fetch = require('isomorphic-fetch')

const url = path => `http://localhost:3000${path}`
//(uses some code from provided sample)
describe('Validate put headline functionality', () => {
	it('validates valid PUT /headline', (done) => {
		// call POST /articles and confirm it adds an article
		const payload = {
			headline: "HELLO!!"	
		}
	    fetch(url('/headline'), {
	        body: JSON.stringify(payload),
	        headers: { 'Content-Type': 'application/json' },
	        method: 'PUT'
	    })
		.then(res => {
			return res.json()
		})
		.then(body => {
			expect(body.headline).to.eql(payload.headline)
		})
		.then(fetch(url("/headlines"))
			.then(res => {
				return res.json()
			})
			.then(body => {
				expect(body.headlines[0].headline).to.eql(payload.headline)
			})
			.then(done)
			.catch(done)
		)
	}, 200)
});
