var express = require('express');
var router = express.Router();
var passport = require('passport');
var User = require('../models/user');
var Offer = require('../models/offer');

router.get('/', function(req, res, next) {
  var pageInfo = {
    title: 'New-Grad Salaries'
  };
  res.render('index', pageInfo);
});

router.get('/auth/facebook',
  passport.authenticate('facebook'));

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect home.
    req.session.recentAuth = true;
    res.redirect('/');
  });

router.get('/auth', function(req, res, next) {
  var recentAuth = req.session.recentAuth;
  req.session.recentAuth = null;
  res.json({
    isAuthenticated: req.isAuthenticated(),
    showSurvey: recentAuth
  });
});

router.post('/submit', function(req, res, next) {
  if (req.isAuthenticated()) {
    User.findOne({_id: req.user._id})
      .populate('offer')
      .exec(function(err, user) {
        if (err || !user) {
          res.json({
            success: false,
            message: "Account error."
          });
        } else {
          if (user.offer != null) {
            res.json({
              success: false,
              message: "Error: You have already submitted the survey."
            });
          } else {
            var offer = new Offer(req.body);
            offer.save(function(err) {
              if (err) {
                res.json({
                  success: false,
                  message: "Database error."
                });
              } else {
                user.update({$set: {offer: offer}}, function(err, u) {
                  if (err) {
                    res.json({
                      success: false,
                      message: "Database error."
                    });
                  } else {
                    res.json({
                      success: true,
                      message: "Submitted!"
                    });
                  }
                });
              }
            });
          }
        }
      });
  } else {
    res.json({
      success: false,
      message: "Error: Please log in first."
    });
  }
});

router.get('/averages', function(req, res, next) {
  params = {};
  if (req.query.ethnicity) {
    params['ethnicity'] = req.query.ethnicity;
  }
  if (req.query.gender) {
    params['gender'] = req.query.gender;
  }
  if (req.query.positionType) {
    params['positionType'] = req.query.positionType;
  }
  if (req.query.companyType) {
    params['companyType'] = req.query.companyType;
  }
  if (req.query.location) {
    params['location'] = req.query.location;
  }
  if (req.query.university) {
    params['university'] = req.query.university;
  }
  Offer.find(params, function(err, docs) {
    if (err) {
      res.send({
        status: 'error',
        message: 'Server error.'
      });
    } else if (docs.length < 10) {
      res.send({
        status: 'success',
        message: 'Not enough data.'
      });
    } else {
      var baseSalarySum = 0;
      var equityAmountSum = 0;
      var equityAmountCount = 0;
      var equityPercentSum = 0;
      var equityPercentCount = 0;
      var signingBonusSum = 0;
      docs.forEach(function(offer) {
        baseSalarySum += offer.baseSalary;
        if (offer.equityAmount > 0) {
          equityAmountSum += offer.equityAmount;
          equityAmountCount += 1
        }
        if (offer.equityPercent > 0) {
          equityPercentSum += offer.equityPercent;
          equityPercentCount += 1
        }
        signingBonusSum += offer.signingBonus;
      });
      res.send({
        status: 'success',
        averages: {
          baseSalaryAverage: (baseSalarySum/docs.length),
          equityAmountAverage: equityAmountCount >= 10 ? (equityAmountSum/equityAmountCount) : null,
          equityPercentAverage: equityPercentCount >= 10 ? (equityPercentSum/equityPercentCount) : null,
          signingBonusAverage: (signingBonusSum/docs.length)
        }
      });
    }
  });
});

router.get('/universities', function(req, res, next) {
  Offer.find({}, function(err, docs) {
    var universities = {};
    docs.forEach(function(doc) {
      var university = doc.university;
      if (!universities[university]) {
        universities[university] = 0;
      }
      universities[university] += 1;
    });
    var popularUniversities = [];
    for (var u in universities) {
      if (!universities.hasOwnProperty(u)) continue;
      var count = universities[u];
      if (count >= 10) {
        popularUniversities.push(u);
      }
    }
    res.send({
      status: 'success',
      universities: popularUniversities
    });
  });
});


module.exports = router;
