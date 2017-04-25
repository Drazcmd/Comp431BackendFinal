const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

// Get the port from the environment, i.e., Heroku sets it
const port = process.env.PORT || 3000
//Run database locally when doing testing
if (process.env.NODE_ENV !== "production") {
    console.log('Currently not running in production!')
    //see https://www.npmjs.com/package/dotenv 
    console.log('inital mongolab uri:', process.env.MONGOLAB_URI)
    console.log('now importing .env.json...\n ')
    require('dot-env')
    console.log('mongolab uri after the import:', process.env.MONGOLAB_URI)
}

//Since some of these end up importing db.js, we need to make
//sure we don't import our src files till after importing .env.json
const auth = require('./auth')
const articles = require('./articles')
const profile = require('./profile.js')
const following = require('./following.js')


/**
 * This might not neccesarily be correct for all cases, I believe I wrote it
 * myself and it could potentially be doing something incorrect. However, it
 * seems to work on chrome with my frontend
 */
function myCorsMiddleware(req, res, next) {
    //no need to deal with this stuff when runnign it all locally
    if (req.headers.host == 'localhost:3000') {
        console.log('running locally - no need for/cannot use cors atm')
        console.log('you should probably remove this when going into staging')
        next()
        return 
    }
    console.log('request:', req.headers)
    if (req.headers.origin) {
        //WHENEVER WE CAN, we want to be using acces control policy properly
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Allow-Credentials', true)
    console.log('got a request!')
    next()
}
const app = express()
//enables CORS if I did stuff correctly
app.use(myCorsMiddleware)
//see https://www.npmjs.com/package/body-parser-json
app.use(bodyParser.json())
app.use(cookieParser())
//gives us register, login, and logout
auth.setup(app)
//gives us GET '/' and get/post '/articles'
articles.setup(app)
//gives us tons of other stubs (mainly profile related)
profile.setup(app)
//gives us get, post, and delete following
following.setup(app)
//To make CORs work (unsecurely), send an all-clear on every OPTIONS http request
app.options('*', (req, res, next) => {
    console.log('ok, got preflight here!')
    res.sendStatus(200)
})

const server = app.listen(port, () => {
     const addr = server.address()
     console.log(`Server listening at http://${addr.address}:${addr.port}`)
})

const index = (req, res) => {
    //purposefully leaving this one unauthenticated - in real life this would
    //be a good way of letting someone making a frontend test they can connect
    res.send({ hello: 'world' })
}
app.get('/', index)
