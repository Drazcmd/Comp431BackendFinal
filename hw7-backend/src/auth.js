const md5 = require('md5')
const model = require('./model.js')
const bodyParser = require('body-parser')
// TODO - in next assignemnt we move the in-memory session id map to a redis
// store (it should really be LRU)
const sessionMap = { }
const cookieKey = 'sid';

/**
 * Remember, never store the passwords themselves in the database!
 * (If you don't understand why that is, go read up on security best-practices)
 * 
 * TODO - md5 isn't neccessarily the best hash funciton to use, but
 * specifically is allowed for this assignment (maybe change to bcrypt later?)
 */
const generateSalt = username => md5(username + Date.now());
const saltAndHashPassword = (salt, password) => md5(password + salt);

/**
 * Will maintain in-memory map for tracking session info, accessing the database
 * to authenticate user credentials (after which it creates a cookie for the
 * client to send us each time)
 */
const login = (req, res) => {
    console.log('Payload received', req.body)

    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
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

/**
 * Creates an authentication entry in the database for the registering user,
 * in addition to giving him/her some default profile information
 *
 * This means we have to create one mongoose document for dealing with login auth,
 * and a 'profile' docuemnt with the profile information defaults
 */
const register = (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) {
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
            console.log('registration can procede: user', username, 'does not already have an entry'); 
            const salt = generateSalt(username)
            const passHash = saltAndHashPassword(salt, password)

            //Going by the instructions, now we have to add exactly two documents: a 'user'...
            model.User({'username': username, 'salt': salt, 'hash': passHash}).save()
            .then(response => {
                console.log('\nsuccessful auth-user object creation ', response)
                //...and a profile
                const initializedProfile = {
                    'username': username, 
                    'status': 'I have no status and I must theme',
                    'following': [ ],
                    'email': 'lorem@lorem.com',
                    'zipcode': 11111,
                    'picture': 'http://random-ize.com/lorem-ipsum-generators/lorem-ipsum/lorem-ipsum.jpg'
                }
                return model.Profile(initializedProfile).save()
            })
            .then(response => {
                console.log('successful profile-info object creation', response)
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
        console.log('error on lookup of username?', err)
        res.sendStatus(400) 
        return
    })

}
//TODO - NOT WORKING YET! But we don't need it for this excercise
const logout = (req, res) => {
    res.sendStatus(400)
    /*
    const username = req.body.username;
    if (!username)  {
        res.sendStatus(400)
        return
    }
    cookie = 0
    if (isLoggedInMiddleware(cookie)){
        //TODO      
    }*/
    return;
}
const isLoggedInMiddleware = (req, res, next) => {
    const sid = req.cookies[cookieKey]
    if (!sid || !sessionMap[sid]) {
        //unauthorized since no provided id
        console.log('invalid sid')
        return res.sendStatus(401)
    }
    const userObj = sessionMap[sid]
    console.log('user auth entry is', userObj)

    //so we can quickly get the authentication data when needed
    //without having to provide refrences to the session map elsewhere
    req.userObj = userObj

    //So that changing password doesn't require re-parsing the cookies
    req.sid = sid

    //(read up on how middleware works if this line confuses you)
    next()
}

/**
 * Remember, it's called 'changePassword' but in reality we're just
 * updating the hash in the database - we don't want to be storing the 
 * passwords themselves!
 */
const changePassword = (req, res) => {
    //set from logged in middleware, not the request itself
    const userObj = req.userObj
    //the new password however IS part of the request body
    const newPassword = req.body.password;
    console.log('request username is:', userObj.username)
    if (!newPassword || !userObj)   {
        res.sendStatus(400)
        return;
    } else {
        //probably not strictly neccesary, but won't hurt
        const newSalt = generateSalt(userObj.username)
        const newPasswordHash = saltAndHashPassword(newSalt, newPassword)
        const newUserObj = {
            username: userObj.username,
            salt: newSalt,
            hash: newPasswordHash
        }
        //First arg is the filter, second is the updated stuff
        model.User.findOneAndUpdate({'username': userObj.username}, newUserObj)
        .then(response => {
            console.log('response to the update:', response)
            res.send({'username': userObj.username, 'result':'success'})
        }).catch(err => {
            console.log('problem with updating password:', err)
            res.send({'username': userObj.username, 'result':'failure'})
        })
    }
}

/*
 * We'll be using this guy basically everywehre except for
 * the login and register functions. So it can't quite apply to everything
 * like the standard middleware... but it is close
 */
exports.isLoggedInMiddleware = isLoggedInMiddleware;
exports.setup = (app => {
    app.post('/login', login)
    app.post('/register', register)
    app.put('/logout', isLoggedInMiddleware, logout)
    app.put('/password', isLoggedInMiddleware, changePassword)
})

