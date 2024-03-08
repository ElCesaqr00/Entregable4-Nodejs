const EmailCode = require("./EmailCode");
const User = require("./Users");


EmailCode.belongsTo(User);
User.hasOne(User);