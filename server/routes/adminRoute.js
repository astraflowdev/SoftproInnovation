const express = require('express')
const Admin = require('../models/Admin')
const router = express.Router();
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')


router.post('/register', async(req,res)=>{
//logic for checking admin alredy register
const c = await Admin.countDocuments()
if(c>0){
    res.json("Admin alredy registered Before ");
}
const user = await new Admin(req.body)
user.save()
res.json("Admin Register successfully")
})

//admin auth routes

router.post('/login', async(req,res)=>{
    const {email, password} = req.body;
    const a = await Admin.findOne({email}).select('password')
    if(!a){
        return res.json({msg:"Invalid Credentials"});

    }
    const ok = await bcrypt.compare(password, a.password)
    if(ok){
        const token = jwt.sign({id:a._id},process.env.JWT_SECRET,{expiresIn:"30d"})
        return res.json({
            msg:"Login Successfully",
            id:a._id,
            token:token

        })
    }
    return res.json({msg:"Invalid Credentials"});
})
module.exports= router;