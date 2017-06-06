var models = require("../models");
var Sequelize = require('sequelize');

var paginate = require('../helpers/paginate').paginate;

// Autoload el quiz asociado a :quizId
exports.load = function (req, res, next, quizId) {

    models.Quiz.findById(quizId)
    .then(function (quiz) {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('No existe ningún quiz con id=' + quizId);
        }
    })
    .catch(function (error) {
        next(error);
    });
};


// GET /quizzes
exports.index = function (req, res, next) {

    var countOptions = {};

    // Busquedas:
    var search = req.query.search || '';
    if (search) {
        var search_like = "%" + search.replace(/ +/g,"%") + "%";

        countOptions.where = {question: { $like: search_like }};
    }

    models.Quiz.count(countOptions)
    .then(function (count) {

        // Paginacion:

        var items_per_page = 10;

        // La pagina a mostrar viene en la query
        var pageno = parseInt(req.query.pageno) || 1;

        // Crear un string con el HTML que pinta la botonera de paginacion.
        // Lo añado como una variable local de res para que lo pinte el layout de la aplicacion.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req.url);

        var findOptions = countOptions;

        findOptions.offset = items_per_page * (pageno - 1);
        findOptions.limit = items_per_page;

        return models.Quiz.findAll(findOptions);
    })
    .then(function (quizzes) {
        res.render('quizzes/index.ejs', {
            quizzes: quizzes,
            search: search
        });
    })
    .catch(function (error) {
        next(error);
    });
};


// GET /quizzes/:quizId
exports.show = function (req, res, next) {

    res.render('quizzes/show', {quiz: req.quiz});
};


// GET /quizzes/new
exports.new = function (req, res, next) {

    var quiz = {question: "", answer: ""};

    res.render('quizzes/new', {quiz: quiz});
};


// POST /quizzes/create
exports.create = function (req, res, next) {

    var quiz = models.Quiz.build({
        question: req.body.question,
        answer: req.body.answer
    });

    // guarda en DB los campos pregunta y respuesta de quiz
    quiz.save({fields: ["question", "answer"]})
    .then(function (quiz) {
        req.flash('success', 'Quiz creado con éxito.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, function (error) {

        req.flash('error', 'Errores en el formulario:');
        for (var i in error.errors) {
            req.flash('error', error.errors[i].value);
        }

        res.render('quizzes/new', {quiz: quiz});
    })
    .catch(function (error) {
        req.flash('error', 'Error al crear un Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = function (req, res, next) {

    res.render('quizzes/edit', {quiz: req.quiz});
};


// PUT /quizzes/:quizId
exports.update = function (req, res, next) {

    req.quiz.question = req.body.question;
    req.quiz.answer = req.body.answer;

    req.quiz.save({fields: ["question", "answer"]})
    .then(function (quiz) {
        req.flash('success', 'Quiz editado con éxito.');
        res.redirect('/quizzes/' + req.quiz.id);
    })
    .catch(Sequelize.ValidationError, function (error) {

        req.flash('error', 'Errores en el formulario:');
        for (var i in error.errors) {
            req.flash('error', error.errors[i].value);
        }

        res.render('quizzes/edit', {quiz: req.quiz});
    })
    .catch(function (error) {
        req.flash('error', 'Error al editar el Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = function (req, res, next) {

    req.quiz.destroy()
    .then(function () {
        req.flash('success', 'Quiz borrado con éxito.');
        res.redirect('/quizzes');
    })
    .catch(function (error) {
        req.flash('error', 'Error al editar el Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = function (req, res, next) {

    var answer = req.query.answer || '';

    res.render('quizzes/play', {
        quiz: req.quiz,
        answer: answer
    });
};


//GET /quizzes/randomplay
exports.randomPlay = function (req, res, next) {

  	// Compruebo si existe
    if(!req.session.juegoRandom){
        req.session.juegoRandom= {
            resueltos: []};
    }

    //Aqui defino el array donde defino las preguntas ya usadas
 

	if (req.session.juegoRandom.resueltos.length >0 ){
		restantes =req.session.juegoRandom.resueltos;
	}else{
		restantes = [-1];
		}

    //Obtengo las preguntas que  quedan sin contestar
    models.Quiz.count({'id':{$notIn:restantes}})


        .then(function (preguntas) {

          //pongo un ID random en función del numero de preguntas
          	if( parseInt(Math.floor(Math.random() * preguntas.length))%2===0){
			indice=1;
		}else
			indice=0;

            return models.Quiz.findAll({ where: {id: { $notIn: restantes}}    , limit:1 , offset:indice}) 
        })

        .then(function (pregunta) {

            var quiz = pregunta[0];
		

	  //Compruebo si quedan preguntas disponibles para preguntar
            if(quiz) {
                res.render('quizzes/random_play', {
                    score: req.session.juegoRandom.resueltos.length,
                    quiz: quiz
                });
            } else { 
		tmp_score= req.session.juegoRandom.resueltos.length
            	req.session.juegoRandom.resueltos = [];
                	res.render('quizzes/random_nomore', {
                    score: tmp_score
                });
            }


    }).catch(function (error) {	
	error.flash('error', 'Error al buscar ' + error.message);
        next(error);
    });
};

// GET /quizzes/:quizId/check
exports.check = function (req, res, next) {

    var answer = req.query.answer || "";

    var result = answer.toLowerCase().trim() === req.quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz: req.quiz,
        result: result,
        answer: answer
    });
};

// GET /quizzes/randomcheck

exports.randomCheck = function (req, res, next) {

    //guardo en answer del query o espacio en blanco
    
    var answer = req.query.answer || "";

    //Indiferencia entra mayusculas y minisculas
    var resultado = answer.toLowerCase().trim() === req.quiz.answer.toLowerCase().trim();

 
    if(resultado){
    	//Si la pregunta se ha respondido correctamente añado la pregunta al array
        req.session.juegoRandom.resueltos.push(req.quiz.id);
    }else{
    	//Reinicio el array de preguntas utilizadas.
    	req.session.juegoRandom.resueltos = [];
    }
    //res para enviar el resultado a random_result.
    res.render('quizzes/random_result', {
        result: resultado,
        score: req.session.juegoRandom.resueltos.length,
        answer: answer
    });

};

