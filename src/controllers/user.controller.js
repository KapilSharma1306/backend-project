import { ApiError } from '../utils/ApiError.js'
import {asyncHandler} from '../utils/asyncHandler.js'
import {User} from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
const registerUser = asyncHandler(async (req,res) => {
   
    // setps of user register
    // get user details from frontend
    // validation like email formate , not empty etc
    // check if user already exists : check through username and email
    // check for images ,check for avatar
    // if it avalable then upload them to cloudinary
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response

    const {fullname,email,username,password} = req.body
    console.log("email: ",email)

    if(
        [fullname,email,username,password].some((field) => 
            field?.trim() === "")
    ){
        throw new ApiError(400,"All field are required")
    }

    const existedUser = await User.findOne({
        $or:[{ username },{ email }]
    })

    if(existedUser){
        throw new ApiError(409,"User with email or username is already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
   
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Somthing went wrong while user registering ")
    }
    
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )

} )

export {registerUser}