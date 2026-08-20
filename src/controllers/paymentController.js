const paymentService = require('../services/paymentService');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const initiatePayment = asyncHandler(async (req, res) => {
  const result = await paymentService.initiatePayment(
    req.body.booking_id,
    req.user.id
  );

  res.status(200).json(
    ApiResponse.ok('Payment initiated', result)
  );
});

const paymentSuccess = asyncHandler(async (req, res) => {
  console.log('🔍 Success callback:', req.body);

  const { tran_id, val_id } = req.body;

  try {
    const result = await paymentService.handlePaymentSuccess(tran_id, val_id);

    console.log('✅ Payment processed:', result);

    // ✅ Frontend-এ redirect
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/booking/success?tran_id=${tran_id}&booking_id=${result.bookingId}`);

  } catch (error) {
    console.error('❌ Success callback error:', error.message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/booking/fail?reason=${encodeURIComponent(error.message)}`);
  }
});

const paymentFail = asyncHandler(async (req, res) => {
  console.log('🔍 Fail callback:', req.body);

  const { tran_id } = req.body;

  if (tran_id) {
    await paymentService.handlePaymentFail(tran_id);
  }

  res.json({
    success: false,
    message: 'Payment failed',
  });
});

const paymentCancel = asyncHandler(async (req, res) => {
  console.log('🔍 Cancel callback:', req.body);

  const { tran_id } = req.body;

  if (tran_id) {
    await paymentService.handlePaymentCancel(tran_id);
  }

  res.json({
    success: false,
    message: 'Payment cancelled',
  });
});

const paymentIPN = asyncHandler(async (req, res) => {
  console.log('🔍 IPN received:', req.body);

  const { tran_id, val_id } = req.body;

  try {
    const result = await paymentService.handlePaymentIPN(tran_id, val_id);

    res.status(200).json({
      success: true,
      message: 'IPN received',
      data: result,
    });
  } catch (error) {
    console.error('❌ IPN error:', error.message);

    res.status(200).json({
      success: false,
      message: 'IPN received but processing failed',
    });
  }
});

const getPaymentStatus = asyncHandler(async (req, res) => {
  const payment = await paymentService.getPaymentStatus(
    req.params.bookingId,
    req.user.id
  );

  res.status(200).json(
    ApiResponse.ok('Payment status retrieved', payment)
  );
});

module.exports = {
  initiatePayment,
  paymentSuccess,
  paymentFail,
  paymentCancel,
  paymentIPN,
  getPaymentStatus,
};