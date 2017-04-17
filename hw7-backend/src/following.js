//'user' as in the currently logged in user. this is currently for stubbing, 
//otherwise we'd want to grab it from profile.js
const user = 'cmd11test'

//eventually this will also end up being a database instead
const followingMap = {}
//'followees' as in people the user are following, not those following the user!
const userFollowees = new Set(['sep1test', 'sep2test'])
//as elsewhere, no good way to do this other than mutation :/
followingMap[user] = userFollowees

exports.setup = function(app){
     app.get('/following/:user?', following)
     app.put('/following/:user?', putFollowing)
     app.delete('/following/:user?', deleteFollowing)
}

const following = (req, res) => {  
    //again, note that it's :users - not :user
    if (!req.user) req.user = user
    if (req.user in followingMap) {
        //spread operator to convert the set (from inside the map) back to list
        res.send({ username: req.user, following: [...followingMap[req.user]]})
    } else {
        res.sendStatus(400)
    }
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

const deleteFollowing = (req, res) => {
    if (!req.user) {
        res.sendStatus(400)
    } else {
        //TODO - if not already following, an error?
        userFollowees.delete(req.user)
        //a bit weird, just like with putFollowing
        res.send({ username: req.user, following: [...userFollowees]})
    }

}
