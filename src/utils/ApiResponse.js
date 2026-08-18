class ApiResponse {
  constructor(statusCode, message, data = null) {
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.statusCode = statusCode;
  }
  
  static ok(message, data) {
    return new ApiResponse(200, message, data);
  }
  
  static created(message, data) {
    return new ApiResponse(201, message, data);
  }
  
  static noContent() {
    return new ApiResponse(204, 'No content');
  }
}

module.exports = ApiResponse;