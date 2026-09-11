import { Router } from 'express'
import { validate } from '../middlewares/validate.middleware.js'
import { registrationLimiter } from '../middlewares/rateLimit.middleware.js'
import { workshopRegistrationRules } from '../validations/onboarding.validation.js'
import * as OnboardingController from '../controllers/onboarding.controller.js'

const router = Router()

router.post(
  '/register',
  registrationLimiter,
  workshopRegistrationRules,
  validate,
  OnboardingController.registerWorkshop
)

export default router
