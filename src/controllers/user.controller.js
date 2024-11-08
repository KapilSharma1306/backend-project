import { ApiError } from '../utils/ApiError.js'
import {asyncHandler} from '../utils/asyncHandler.js'
import {User} from '../models/user.model.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from 'jsonwebtoken'

// generate access and refresh token

const generateAccessAndRefresh = async(userId) => {
    try {
       const user = await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()
       user.refreshToken = refreshToken
       await user.save({validateBeforeSave:false})
       return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

// User registeration part

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
    // console.log("email: ",email)

    if(
        [fullname,email,username,password].some((field) => // check there data points are not empty
            field?.trim() === "")
    ){
        throw new ApiError(400,"All field are required")
    }

    const existedUser = await User.findOne({       // check this user is already exists or not in database using email and username
        $or:[{ username },{ email }]
    })

    if(existedUser){                              // if user exist then give error
        throw new ApiError(409,"User with email or username is already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;     //find local path of avatar
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){   ////find local path of avatar
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){                 //if avatar don't exist then give error
        throw new ApiError(400,"Avatar file is required")
    }
   
    const avatar = await uploadOnCloudinary(avatarLocalPath)  // upload on cloudinary 
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){              // if avatar not upload then give error
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({     //create a user object using the User . here 'create' is used to push the user object in db'
        fullname,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = User.findById(user._id).select(     // remove password and refersh token from getting
        "-password -refreshToken"
    )

    if(!createdUser){                     // if user is not create in db then give error
        throw new ApiError(500,"Somthing went wrong while user registering ")
    }
    
    return res.status(201).json(                 // give response when data is stored in db
        new ApiResponse(200,createdUser,"User registered Successfully")
    )

} )

// login part

const loginUser = asyncHandler(async(req,res) => {
     // Process
     // get data from req body 
     // give access through username or email
     // find the user
     // if login then password check
     // if password metch then generate access token and refresh token
     // send access token and refresh token through cookie 

     const {email,username,password} = req.body

     if(!username || !email){
        throw new ApiError(400,"username or password is required")
     }
    
    const user = User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefresh(user._id)

    const loggedInUser = User.findById(user._id).select("-password -refreshToken")

    const options = {            // create options for sending cookie
        httpOnly:true,           // only backend can modifyable without these two propertys any can access cookie and modify it
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged In Successfully"
        )
    )
})

// LogoutUser

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },{
            new:true
        }
    )

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,"User logged out"))
})

// refresh Access Token

const refreshAccessToken = asyncHandler(async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
          throw new ApiError(404,"unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh tokene")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
        
        const {accessToken,newrefreshToken} = await generateAccessAndRefresh(user._id)
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,newrefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh token")
    }
})
export {registerUser,loginUser,logoutUser,refreshAccessToken}