const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const auth = require('./auth')
// Get the port from the environment, i.e., Heroku sets it
const port = process.env.PORT || 3000

const app = express()
//see https://www.npmjs.com/package/body-parser-json
app.use(bodyParser.json())
//gives us register, login, and logout
app.use(cookieParser())
auth.setup(app)

const server = app.listen(port, () => {
     const addr = server.address()
     console.log(`Server listening at http://${addr.address}:${addr.port}`)
})

