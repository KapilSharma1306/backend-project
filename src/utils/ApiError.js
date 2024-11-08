class ApiError extends Error{
    constructor(
        statusCode,
        message = "Somthing went wrong",   //if not provided then this string is used bydefaultly
        errors = [],
        stack = ""
    ){
       super(message)
       this.statusCode = statusCode
       this.data = null
       this.message = message
       this.success = false
       this.errors = errors

       if(this.stack){
           this.stack = stack
       }else{
        Error.captureStackTrace(this,this.constructor)
       }
    }
}

export {ApiError}