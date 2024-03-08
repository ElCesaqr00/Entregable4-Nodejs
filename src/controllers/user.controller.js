const catchError = require('../utils/catchError');
const Users = require('../models/Users');
const bcrypt = require("bcrypt");
const sendEmail = require('../utils/sendEmail');
const EmailCode = require('../models/EmailCode');
const jwt = require("jsonwebtoken")

const getAll = catchError(async(req, res) => {
    const results = await Users.findAll();
    return res.json(results);
});

const create = catchError(async(req, res) => {
    const {email, firstName, lastName, password, country, image, frontBaseUrl } = req.body;
    const passEncrypted = await bcrypt.hash(password, 10);
    const result = await Users.create({
        email,
        firstName,
        lastName,
        password: passEncrypted,
        country,
        image
    });
    const code = require('crypto').randomBytes(32).toString('hex') ;
    const link = `${frontBaseUrl}/${code}`
    
    await EmailCode.create({
        code,
        userId: result.id,
    })
    
    await sendEmail({
		to: email, 
		subject: "Activacion de cuenta",
		html: `<div style="text-align: center">
        <img style="width: 6rem" src="https://asset.brandfetch.io/idtHcoNuSm/idR3MrOs7m.jpeg" </img>
        <h1>Correo de verificación</h1>
        <p>Te envio este correo para que habilites tu cuenta mediante el siguiente link:</p>
        <p><a href=${link}> Verifica Aqui </a></p>
        <p>${link}</p> 
        </div>` // texto
})
    return res.status(201).json(result);
});

const getOne = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await Users.findByPk(id);
    if(!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async(req, res) => {
    const { id } = req.params;
    await Users.destroy({ where: {id} });
    return res.sendStatus(204);
});

const update = catchError(async(req, res) => {
    const { firstName, lastName, country, image } = req.body;
    const { id } = req.params;
    const result = await Users.update(
        req.body,
        { where: {id}, returning: true }
    );
    if(result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

const verfyEmail =  catchError(async(req, res) => {
    const { code } = req.params;
    const codeEmail = await EmailCode.findOne({ 
        where: { code : code}
    });
    if(!codeEmail) return res.status(401).json({ message: "Wrong code"})
    const updateUser = await Users.update(
    { isVerified: true},
    { where: { id : codeEmail.userId}, returning: true}
    );
    await codeEmail.destroy()
    return res.json(updateUser[1][0]);
});

const login = catchError(async(req, res) =>{
    const { email, password } = req.body;
    const user = await Users.findOne({where: { email : email}});
    
    if(!user) {
        return res.status(401).json({ message: "No se econtró el correo"})
};

    if(user.isVerified === false){
        return res.status(401).json({ message: "No has verificado tu cuenta"})
}
    const isValid = await bcrypt.compare(password, user.password);
        if(!isValid) return res.status(401).json({ message: "contraseña erronea"});

    

    const token = jwt.sign(
        {user},
        process.env.TOKEN_SECRET,
        {expiresIn : "1d"}
    )
    return res.json({user, token})
})

const getLoggedUser = catchError(async(req, res) =>{
    return res.json(req.user)
})

Users.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
}

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    verfyEmail,
    login,
    getLoggedUser
}