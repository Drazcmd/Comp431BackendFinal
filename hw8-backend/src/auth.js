const md5 = require('md5')
const model = require('./model.js')
const bodyParser = require('body-parser')
const REDIS_URL = "redis://h:p58afdee5f98f2e9a6d89cb8f0f284a3b46ff8644bda0c55b4b9bddc6206e451b@ec2-34-206-56-30.compute-1.amazonaws.com:45719"
const redis = require('redis').createClient(process.env.REDIS_URL || REDIS_URL)
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
    console.log('\n\n')
    console.log('\n\n')
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
            redis.hmset(sid, userObj)
            redis.hgetall(sid, (err, userObj) => {
                if (err) {
                    console.log('Uh oh! Problem creating session cookie')
                    res.sendStatus(401)
                    throw 'Problem accessing newly created sesion cookie in redis?'
                }
                console.log(sid, 'mapped to ', userObj)
            })
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
 * The only tricky part is that date of birth might be null, and I've decided
 * to allow that (for now at least)
 */
const initializeProfile = (username, email, zipcode, dob) => {
    const profile = dob && dob.toString() ? {
            'username': username, 
            'status': 'I got 99 problems, but a dob aint one',
            'following': [ ],
            'email': email,
            'zipcode': zipcode,
            'dob': dob.toString(),
            'picture': 'http://random-ize.com/lorem-ipsum-generators/lorem-ipsum/lorem-ipsum.jpg'
        } : {
            'username': username, 
            'status': 'I have no status and I must theme',
            'following': [ ],
            'email': email, 
            'zipcode': zipcode,
            'dob': "700000000000",
            'picture': 'http://random-ize.com/lorem-ipsum-generators/lorem-ipsum/lorem-ipsum.jpg'
        } 
    return profile
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
    const email = req.body.email;
    const zipcode = req.body.zipcode;
    const password = req.body.password;
    //date of birth is not required, but supported if provided
    //This is due to the API and requirements being vague and/or
    //contradictory as to whether we do or do not need it 
    const dob = req.body.dob
    if (!(username && zipcode && email && password)) {
        console.log('missing one of the required fields for registration!')
        res.sendStatus(400)
        return
    }

    const initializedProfile = initializeProfile(username, email, zipcode, dob)
    console.log('If we end up making it, the requested profile will be this:', initializedProfile)

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
            returningn
        }
    })
    .catch(err => {
        console.log('error on lookup of username?', err)
        res.sendStatus(400) 
        return
    })
}

const logout = (req, res) => {
    const sid = req.cookies[cookieKey]
    console.log('logging out from this cookie')
    console.log(sid)
    redis.del(sid, (err, response) => {
        if (err){
            console.log('problem logigng out')
            res.sendStatus(400)
        } else {
            console.log('delete worked')
            console.log('(we got this response):', response)
            res.sendStatus(200)
        }
    })
}
const isLoggedInMiddleware = (req, res, next) => {
    const sid = req.cookies[cookieKey]
    if (!sid) {
        //unauthorized since no provided id
        console.log('invalid sid')
        res.sendStatus(400)
        return
    }
    redis.hgetall(sid, (err, userObj) => {
        if (err) {
            console.log('Uh oh! Problem accessing on redis. Looks like an invalid sid cookie')
            res.sendStatus(400)
            return
        } else if (!userObj){
            console.log('uh oh! Couldnt find the user object on redis. Looks logged out?')
            res.sendStatus(401)
            return
        } else {
            console.log(sid, 'mapped to', userObj)
            //so we can quickly get the authentication data when needed
            //without having to provide refrences to the session map elsewhere
            req.userObj = userObj

            //So that changing password doesn't require re-parsing the cookies
            req.sid = sid

            //(read up on how middleware works if this line confuses you)
            next()
        }
    })
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

