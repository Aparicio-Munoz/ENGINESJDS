export class ApiResponse {
  static success(res, data, message = 'OK', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    })
  }

  static created(res, data, message = 'Creado exitosamente') {
    return res.status(201).json({
      success: true,
      message,
      data,
    })
  }

  static noContent(res) {
    return res.status(204).send()
  }

  static paginated(res, data, pagination) {
    return res.status(200).json({
      success: true,
      message: 'OK',
      data,
      pagination: {
        total:      pagination.total,
        page:       pagination.page,
        limit:      pagination.limit,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    })
  }
}
