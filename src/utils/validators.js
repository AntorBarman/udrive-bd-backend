const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidBangladeshPhone = (phone) => {
  const phoneRegex = /^(\+8801|01)[0-9]{9}$/;
  return phoneRegex.test(phone);
};

const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

const isFutureDate = (dateString) => {
  const date = new Date(dateString);
  return date > new Date();
};

module.exports = {
  isValidEmail,
  isValidBangladeshPhone,
  isValidUUID,
  isValidDate,
  isFutureDate,
};