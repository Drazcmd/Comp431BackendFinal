const model = require('./model.js')
const isLoggedInMiddleware = require('./auth').isLoggedInMiddleware

const findFollowees = (requestedUser) => {
    console.log("Getting the users that this person follows: ", requestedUser)
    const databaseFilter = {'username': requestedUser}
    return model.Profile.find(databaseFilter).then(response => {
        console.log('response to find:', response)
        return response.following ? response.following : []
    })
}

/**
 * Although similar to code for grabbing emails/zipcodes, it's different enough
 * that we really need to have our own completely isolated function for this stuff
 */
const following = (req, res) => { 
    const requestedUser = req.params.user ? req.params.user : req.userObj.username
    findFollowees(requestedUser)
    .then(following => {
        //('following' as in the people that the requested user is following)
        console.log(requestedUser, 'is following these people:', following)
        res.send({'username': requestedUser, 'following': following})
    })
    .catch(err => {
        console.log('Problem with database query?:', err)
        res.sendStatus(400)
    })
}

const putFollowing = (req, res) => {
    if (!req.user) {
        res.sendStatus(400)
    } else {
        //TODO - if already following, do an error?
        userFollowees.add(req.user)
        //Note how the username returned is the userid that was just added 
        //to the list returned as the value of 'following'; it's a little odd!
        res.send({ username: req.user, following: [...userFollowees]})
    }
}

/**
 * Cleanest way I found is to do one find operation to get the current follwoers,
 * do a fileter operation on it, and then do a findAndUpdate to set the followers
 * to the result (which will have said follower filtered out)
 */
const deleteFollowing = (req, res) => {
    //no default user on this one! Either id is provided or we have a problem
    const userToDelete = req.params.user
    if (!userToDelete) {
        res.sendStatus(400)
        return
    }
    //First step - find out who we follow...
    findFollowees(req.userObj.username)
    .then(following => {
        const updatedFollowees = following.filter((followee) => {
            followee != userToDelete
        })
        model.Profile.findOneAndUpdate({'username': userObj.username}, {'following': updatedFollowees})
        .then(response => {
            console.log('response to the update:', response)
            res.send({'username': response.username, 'following': response.following})
        }).catch(err => {
            console.log('Problem on database update??', err)
            res.sendStatus(400)
        })
    })
    .catch(err => {
        console.log('Problem on database find??', err)
        res.sendStatus(400)
    })

}
exports.setup = function(app){
    app.get('/following/:user?', isLoggedInMiddleware, following)
    app.put('/following/:user?', isLoggedInMiddleware, putFollowing)
    app.delete('/following/:user?', isLoggedInMiddleware, deleteFollowing)
}
