import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import {User} from "../models/user.model.js"

export const verifyJWT = asyncHandler(async(req,res,next) => {                 // we edded cookie when user login now we 
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer","");       //are trying to get that cookie and token from it if not then if check the header 
                                                                                                        // of request if a Authorization properties exist with bearer value then replace it with empty string
    
        if(!token){                                              // check if token is empty then throw a error
            throw new ApiError(401,"Unauthorized request")
        }
    
        const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)           // now verify that token through jwt.verify
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")    // now select the user in User collection using id in decodedToken which is set during the creating access token
        if(!user){                                                                            // if user does not exist then give an error
            throw new ApiError(401,"Invalid Access Token")
        }
        req.user = user;                                               // now create a object in request with user name and assign it with user
        next()  
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid access token")
    }                                                       // after adding user object then proceed to next funtionallity using next()
})

export {verifyJWT};