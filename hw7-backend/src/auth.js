const md5 = require('md5')
const model = require('./model.js')
const bodyParser = require('body-parser')
const REDIS_URL = "redis://h:p58afdee5f98f2e9a6d89cb8f0f284a3b46ff8644bda0c55b4b9bddc6206e451b@ec2-34-206-56-30.compute-1.amazonaws.com:45719"

exports.setup = function(app){
    app.post('/login', login)
    app.post('/register', register)
    app.put('/logout', isLoggedIn, logout)
}


// TODO - in next assignemnt we move the in-memory session id map to a redis
// store (it should really be LRU)
const sessionMap = { }
const cookieKey = 'sid';

const login = (req, res) => {
	console.log('Payload received', req.body)

	const username = req.body.username;
	const password = req.body.password;
	if (!username || !password)	{
		console.log('invalid login request')
		res.sendStatus(400)
		return
	}

	model.User.find({username: username}).then(response => {
		//TODO - this print might be a security vuln if kept in production.
		//might want to remove it before then
		console.log('for requested username', username, 'database contained ', response)

		//should only be returning one user object per username - otherwise there is a problem
		if (response.length != 1) {
			console.log('Likely an invalid user, or the database is messed up')
			res.sendStatus(401)	
			return
		}
		const userObj = response[0]
		const saltedInput = password + userObj.salt
		const hashedInput = md5(saltedInput)
		if (hashedInput === userObj.hash){
	        //TODO - not really secure, but 'good enough' for this assignment.
	        //In reality, use a better rng (window.crypto?) and possibly hash
	        const dateStr = new Date().getTime().toString()
	        const randomStr = Math.random().toString()
			const sid = md5(dateStr + randomStr)
			console.log('our new session id is:', sid)
			sessionMap[sid] = userObj

			//we'll be needign this cookie on all incoming requests to check if logged in	
			console.log('setting response cookie')
			res.cookie(cookieKey, sid, {maxAge: 3600*1000, httpOnly: true})

			console.log('sending login success message back')
			const msg = {username: username, result: 'success'}
			res.send(msg)
		} else {
			console.log('Valid user, but provided password hashed to incorrect value')

			//TODO - this print might be a security vuln if kept in production.
			//might want to remove it before then
			console.log('Resulting hash was', hashedInput)
			const msg = {username: username, result: 'failure'}
			res.send(msg)
		}
	}).catch(err => {
		console.log('problem with database lookup:', err)
		res.sendStatus(400)
		return
	})


}

const register = (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	if (!username || !password)	{
		res.sendStatus(400)
		return
	}

	//we don't want to allow multiple users with the same username
	model.User.find({username: username})
	.then(response => {
		//TODO - this print might be a security vuln if kept in production.
		//might want to remove it before then
		console.log('for requested username', username, 'database contained ', response)

		//this had better be an empty array, otherwise the user already exists
		if (response.length == 0) {
			console.log('user', username, 'does not already have an entry; registration can procede')

			//TODO - md5 isn't neccessarily the best hash funciton to use, but
			//specifically is allowed for this assignment (maybe change to bcrypt later?)
			const salt = md5(username + Date.now())
			const saltedPass = password + salt
			const hash = md5(saltedPass)

			model.User({'username': username, 'salt': salt, 'hash': hash}).save()
			.then(response => {
				console.log('successful registration: ', response)
				const msg = {username: username, result: 'success'}
				res.send(msg)
			}).catch(err => {
				console.log('registered failure. error:', err)
				const msg = {username: username, result: 'failure'}
				res.send(msg)
			})
		} else {
			console.log('Request was to register an lready existing user - not ok!')
			res.sendStatus(401)	
			return
		}
	})
	.catch(err => {
		console.log('error on lookup of username?')
		res.sendStatus(400)	
		return
	})

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
