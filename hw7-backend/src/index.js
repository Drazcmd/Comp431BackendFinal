const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const auth = require('./auth')
const articles = require('./articles')
const profile = require('./profile.js')
const following = require('./following.js')
// Get the port from the environment, i.e., Heroku sets it
const port = process.env.PORT || 3000

//Run database locally when doing testing
if (process.env.NODE_ENV !== "production") {
    require('dot-env')
}


/**
 * This might not neccesarily be correct for all cases, I believe I wrote it
 * myself and it could potentially be doing something incorrect. However, it
 * seems to work on chrome with my frontend
 */
function myCorsMiddleware(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', req.get('origin'))
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    console.log('got a request!')
    next()
}
const app = express()
//enables CORS if I did stuff correctly
app.use(myCorsMiddleware)
//see https://www.npmjs.com/package/body-parser-json
app.use(bodyParser.json())
//gives us register, login, and logout
app.use(cookieParser())
//gives us GET '/' and get/post '/articles'
auth.setup(app)
//gives us login, register, logout
articles.setup(app)
//gives us tons of other stubs (mainly profile related)
profile.setup(app)
//gives us get, post, and delete following
following.setup(app)
//To make CORs work (unsecurely), send an all-clear on every OPTIONS http request
app.options('*', (req, res, next) =>{
    console.log('ok, got preflight here!')
    res.sendStatus(200)
})

const server = app.listen(port, () => {
     const addr = server.address()
     console.log(`Server listening at http://${addr.address}:${addr.port}`)
})

