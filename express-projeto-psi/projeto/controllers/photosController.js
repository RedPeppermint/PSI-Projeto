var PhotoModel = require('../schemas/photo');
var UserModel = require('../schemas/user');
const db = require('mongoose').connection;
const shared_secret = require('../sharedSecret').shared_secret;
const jwt = require('jsonwebtoken');



exports.photo_get = function(req, res) {
    var id = req.params.id;
    PhotoModel.find({ _id: id }, function(err, model) {
        if (err) {
            res.status(500).json({ Error: "Photo not found." });
        } else {
            res.status(200).json(model);
        }
    });
}

exports.fav_photos_get = function(req, res) {
    var user_id = req.params.id;
    UserModel.findById(user_id, function(err, result) {
        if (err) {
            res.status(500).json({ Error: "user not found." });
        } else {
            console.log("user: " + result);
            var ids = result.favourites.map(id => mongoose.Types.ObjectId(id));
            console.log("ids: " + ids);
            PhotoModel.find({ '_id': { $in: ids } }, function(err, results) {
                if (err) {
                    res.status(500).json({ Error: "problem getting favourite photos." });
                } else {
                    res.status(200).json(results);
                }
            });
        }
    });
}

function photosGetAll(res, number_of_results) {
    PhotoModel.find().limit(number_of_results).then(results => res.status(200).json(results)).catch(err => {
        console.log(err);
        res.status(500).json({ Error: "Error while fetching photos." });
    });
}

function photosFiltered(res, filter_used, number) {
    PhotoModel.find().sort({
        [filter_used]: -1
    }).limit(number).then(results => res.status(200).json(results)).catch(err => {
        console.log(err);
        res.status(500).json({ Error: "Error while fetching photos." });
    })

}

function like(photo_id, user_id, res) {
    UserModel.find({ _id: user_id }, function(err, model) {
        if (err) {
            res.json({ Error: "User not found." });
        } else {
            console.log(model);
            PhotoModel.updateOne({ _id: photo_id, likes: { $ne: user_id } }, { $push: { likes: user_id } }, function(err) {
                if (err) {
                    res.status(500).json({ Error: "Error liking a the photo" });
                } else {
                    res.status(200).json({ INFO: "Liked" });
                }
            });
        }
    });
}

function dislike(photo_id, user_id, res) {
    UserModel.find({ _id: user_id }, function(err, model) {
        if (err) {
            res.json({ Error: "User not found." });
        } else {
            PhotoModel.updateOne({ _id: photo_id }, { $pull: { likes: user_id } }, function(err) {
                if (err) {
                    res.status(500).json({ Error: "Error taking like on photo" });
                } else {
                    res.status(200).json({ INFO: "Disliked" });
                }
            });
        }
    });
}


function favourite(photo_id, user_id, res) {
    UserModel.updateOne({ _id: user_id, favourites: { $ne: photo_id } }, { $push: { favourites: photo_id } }, function(err, model) {
        if (err) {
            res.status(500).json({ Error: "User not found." });
        } else {
            res.status(200).json({ INFO: "Favourited" });
        }
    })
}

function unfavourite(photo_id, user_id, res) {
    UserModel.updateOne({ _id: user_id }, { $pull: { favourites: photo_id } }, function(err, model) {
        if (err) {
            res.status(500).json({ Error: "User not found." });
        } else {
            res.status(200).json({ INFO: "Unfavourited" });
        }
    })
}

exports.photo_update = function(req, res) {
    var id = req.params.id;
    var action = req.body.action;
    var user = getUserIDofToken(req);
    if (!user) {
        res.status(500).json({ Error: "User not found" });
        return;
    }
    if (action == "like") {
        like(id, user, res);
    } else if (action == "favourite") {
        favourite(id, user, res);
    } else if (action == "dislike") {
        console.log("Entrou no dislike");
        dislike(id, user, res);
    } else if (action === "unfavourite") {
        unfavourite(id, user, res);
    }
}

exports.photos_get = function(req, res) {
    var filter = req.query.filter;
    var number_of_results = parseInt(req.query.number_of_results);
    if (filter) {
        photosFiltered(res, filter, number_of_results);
    } else {
        photosGetAll(res, number_of_results);
    }
}

exports.photo_post = function(req, res) {
    var photos = req.body.photos;
    id = getUserIDofToken(req);
    if (!id) {
        console.log("fudeu ID");
        res.status(500).json({ Error: "User not found" });
        return;
    }
    for (let i = 0; i < photos.length; i++) {
        var element = photos[i];
        element.user_id = id;
    }
    PhotoModel.insertMany(photos).then(val => {
        const ids = val.map(val => val._id);
        UserModel.updateOne({ _id: id }, {
            $push: { photos_id: { $each: ids } }
        }, function(err) {
            if (err) {
                console.log(err);
                res.status(500).json({ Error: "error while creating photo" });
            } else {
                console.log("deu certo");
                res.status(200).json({ INFO: "Photos posted" });
            }
        });
    }).catch((err) => {
        console.log(err);
        res.status(500).json({ Error: "error while creating photo" });
    })
}

exports.photo_delete = function(req, res) {
    var id = req.params.id;
    PhotoModel.findByIdAndRemove({ _id: id }, function(err, result) {
        if (err) {
            res.status(500).json({ Error: "Photo not found." });
        } else {
            UserModel.findByIdAndUpdate(result.user_id, { $pull: { photos_id: id } }, function(err) {
                if (err) {
                    res.status(500).json({ Error: "Error trying to delete photo from user." });
                } else {
                    res.status(200).json({ INFO: "Photo deleted" });
                }
            });
        }
    });
}

function getUserIDofToken(req) {
    try {
        var token = req.headers['authorization'].split(' ')[1];
        var decoded = jwt.verify(token, shared_secret);
        return decoded.userID;
    } catch (err) {
        console.log(err);
        return null;
    }


}