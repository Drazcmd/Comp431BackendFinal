const express = require('express')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

// Get the port from the environment, i.e., Heroku sets it
const port = process.env.PORT || 3000

//In production, environment (i.e. probably heroku) will be setting all the
//process.env fields (either automaticalyl or because we configured it to do so)
if (process.env.NODE_ENV !== "production") {
    //However, you'll want to be able to run stuff locally when doing testing
    //At such time, all the relevant process.env stuffs should be in .env.json
    //see https://www.npmjs.com/package/dotenv 
    console.log('Currently not running in production! The following values should be null:')
    console.log('inital mongolab uri:', process.env.MONGOLAB_URI)
    console.log('inital redis uri:', process.env.REDIS_URI)
    console.log('inital Google OAuth2 client id:', process.env.GOOGLE_CLIENT_ID)
    console.log('inital Google OAuth2 client secret:', process.env.GOOGLE_CLIENT_SECRET)

    console.log('now importing .env.json to set them...\n ')
    require('dot-env')
    console.log('done importing .env.json\n')

    console.log('mongolab uri after the import:', process.env.MONGOLAB_URI)
    console.log('redis uri after the import:', process.env.REDIS_URI)
    console.log('Google OAuth2 client id after the import:', process.env.GOOGLE_CLIENT_ID)
    console.log('Google OAuth2 client secret after the import - not telling :p ^-^')
}

//Since some of these end up using various things in process.env (or importing a
//file that does, such as db.js), we need to MAKE CERTIAN we don't import our src
//files till after importing .env.json (only if running locally, of course - when
//in production such values should be set already in process.env to begin with)
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
//The order of some of this stuff is VERY important - be careful about chaning!
//(cors is essential for using with my frontend)
app.use(myCorsMiddleware)
app.use(session({ secret: 'thisisMysecrethahahahahabutseriouslychangeforproduction'}))
app.use(auth.passport.initialize())
app.use(auth.passport.session())

//see https://www.npmjs.com/package/body-parser-json
app.use(bodyParser.json())
app.use(cookieParser())

//gives us register, login, and logout, in addition to 
//setting relevant passport middleware. NOTE - because this
//guy uses middleware, import it before any of the other source files
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
