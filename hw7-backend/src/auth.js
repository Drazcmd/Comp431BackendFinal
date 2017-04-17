const md5 = require('md5')
const bodyParser = require('body-parser')
const REDIS_URL = "redis://h:p58afdee5f98f2e9a6d89cb8f0f284a3b46ff8644bda0c55b4b9bddc6206e451b@ec2-34-206-56-30.compute-1.amazonaws.com:45719"

exports.setup = function(app){
    app.post('/login', login)
    app.post('/register', register)
    app.put('/logout', isLoggedIn, logout)
}


//Maps username to hash
const authMap = { }
const cookieKey = 'sid';

// - we moved the in-memory session id map to a redis store
const redis = require('redis').createClient(process.env.REDIS_URL || REDIS_URL)


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
        //TODO - this isn't good, because with lots of users might not be unique!
        //Better idea - use a monotonically increasing or decreasing function. But ideally
        //not something predictable (i.e. always add 1 or something) so that you don't leak
        //information about other users (security hole??)
		const sid = Math.random().toString()
		res.cookie(cookieKey, sid, {maxAge: 3600*1000, httpOnly: true})

        redis.hmset(sid, userObj)
        redis.hgetall(sid, function(err, userObj) {
            console.log(sid + 'mapped to ' + userObj)
        })
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
