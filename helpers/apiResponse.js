exports.successResponse = (res, message) => {
  const data = {
    success: true,
    message
  };
  return res.status(200).json(data);
};

exports.successResponseWithData = (res, message, data) => {
  const resData = {
    success: true,
    message,
    data,
  };
  return res.status(200).json(resData);
};
exports.successResponseWithDataStats = (res, message, data, stats) => {
  const resData = {
    success: true,
    message,
    data,
    stats
  };
  return res.status(200).json(resData);
};

exports.successResponseWithPagination = (res, page, total, perPage, data) => {
  const resData = {
    pagination: {
      page: +page,
      pages: Math.ceil(total / perPage),
      total: data.length,
      totalRecords: total,
      pageSize: perPage,
    },
    data,
  };
  return res.status(200).json(resData);
};

exports.successResponseWithPaginationAdditionalData = (
  res,
  page,
  total,
  perPage,
  data,
  pending,
  received,
  reserved
) => {
  const resData = {
    pagination: {
      page: +page,
      pages: Math.ceil(total / perPage),
      total: data.length,
      totalRecords: total,
      pageSize: perPage,
    },
    data,
    pending,
    received,
    reserved,
  };
  return res.status(200).json(resData);
};

exports.validationErrorWithData = (res, message, data = {}) => {
  const resData = {
    success: false,
    message,
    data,
  };
  return res.status(400).json(resData);
};

exports.badRequestResponse = (res, message) => {
  const data = {
    success: false,
    message
  };
  return res.status(400).json(data);
};

exports.unauthorizedResponse = (res, message) => {
  const data = {
    success: false,
    message,
  };
  return res.status(401).json(data);
};

exports.forbiddenResponse = (res, message) => {
  const data = {
    success: false,
    message
  };
  return res.status(403).json(data);
};

exports.notFoundResponse = (res, message) => {
  const data = {
    success: false,
    message,
  };
  return res.status(404).json(data);
};

exports.ProxyError = (res, message) => {
  const data = {
    success: false,
    message,
  };
  return res.status(407).json(data);
};

exports.conflictResponse = (res, message) => {
  const data = {
    success: false,
    message,
  };
  return res.status(409).json(data);
};

exports.rateLimitResponse = (res, message) => {
  const data = {
    success: false,
    message,
  };
  return res.status(429).json(data);
};

exports.JwtErrorResponse = (res, message) => {
  const data = {
    success: false,
    message,
  };
  return res.status(440).json(data);
};

exports.ErrorResponse = (res, message) => {
  const data = {
    success: false,
    message,
  };
  return res.status(500).json(data);
};
