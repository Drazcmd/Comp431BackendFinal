const bodyParser = require('body-parser')
exports.setup = function(app){
    app.post('/login', login)
    app.post('/register', register)
    app.put('/logout', logout)
}
//these are all stubbed
const login = (req, res) => {
	const msg = {username: 'cmd11test', result: 'success'}
}
const register = (req, res) => {
	const msg = {username: 'cmd11test', result: 'success'}
	res.send(msg)
}
const logout = (req, res) => {
	//200 for 'OK'
	res.sendStatus(200)
}
