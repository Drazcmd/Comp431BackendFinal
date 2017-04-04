const md5 = require('md5')
const bodyParser = require('body-parser')
exports.setup = function(app){
    app.post('/login', login)
    app.post('/register', register)
    app.put('/logout', isLoggedIn, logout)
}
//Maps username to hash
const authMap = { }
const cookieKey = 'sid'
const sessionMap = { }
const login = (req, res) => {
	console.log('Payload received', req.body)

	const username = req.body.username;
	const password = req.body.password;
	if (!username || !password)	{
		console.log('nope')
		res.sendStatus(400)
		return
	}

	const userObj = authMap[username]
	if (!(username in authMap && userObj)){
		res.sendStatus(401)
		return
	}

	const saltedInput = password + userObj.salt
	const hashedInput = md5(saltedInput)
	if (hashedInput === userObj.hash){
		const sessionId = Math.random().toString()
		res.cookie(cookieKey, sessionId, {maxAge: 3600*1000, httpOnly: true})
		sessionMap[sessionId] = username
		const msg = {username: username, result: 'success'}
		res.send(msg)
	} else {
		const msg = {username: username, result: 'failure'}
		res.send(msg)
	}

}
const register = (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	if (!username || !password)	{
		res.sendStatus(400)
		return
	}
	const salt = Date.now()
	const saltedPass = password + salt
	console.log(saltedPass)
	const hash = md5(saltedPass)
	authMap[username] = {salt: salt, hash: hash}
	console.log(authMap)
	const msg = {username: username, result: 'success'}
	res.send(msg)
}
//TODO - NOT WORKING YET! But we don't need it for this excercise
const logout = (req, res) => {
	res.sendStatus(400)
	/*
	const username = req.body.username;
	if (!username)	{
		res.sendStatus(400)
		return
	}
	cookie = 0
	if (isLoggedIn(cookie)){
		//TODO		
	}*/
	return;
}
const isLoggedIn = () => {
	return;
}