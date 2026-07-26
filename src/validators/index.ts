export {
  objectIdSchema,
  optionalObjectIdSchema,
  slugSchema,
  urlOrPathSchema,
  imageUploadSchema,
  currencySchema,
  dateSchema,
  paginationSchema,
  formatZodError,
} from "./common";
export type { PaginationInput } from "./common";

export {
  registerUserSchema,
  loginUserSchema,
  createUserSchema,
  updateUserSchema,
  updatePassportSchema,
  adminVerifyUserSchema,
  changePasswordSchema,
  userRoleSchema,
  userStatusSchema,
  verificationStatusSchema,
  passportSchema,
} from "./user.validator";
export type {
  RegisterUserInput,
  LoginUserInput,
  CreateUserInput,
  UpdateUserInput,
  ChangePasswordInput,
  PassportInput,
  AdminVerifyUserInput,
} from "./user.validator";

export {
  loginSchema,
  registerSchema,
  registerStep1Schema,
  registerStep2Schema,
  registerStep3Schema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validator";
export type {
  LoginInput,
  RegisterInput,
  RegisterStep1Input,
  RegisterStep2Input,
  RegisterStep3Input,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.validator";


export { createCategorySchema, updateCategorySchema } from "./category.validator";
export type { CreateCategoryInput, UpdateCategoryInput } from "./category.validator";

export { createMoodSchema, updateMoodSchema } from "./mood.validator";
export type { CreateMoodInput, UpdateMoodInput } from "./mood.validator";

export {
  createDestinationSchema,
  updateDestinationSchema,
  destinationQuerySchema,
} from "./destination.validator";
export type {
  CreateDestinationInput,
  UpdateDestinationInput,
  DestinationQueryInput,
} from "./destination.validator";

export {
  createActivitySchema,
  updateActivitySchema,
  activityCategorySchema,
} from "./activity.validator";
export type { CreateActivityInput, UpdateActivityInput } from "./activity.validator";

export {
  createTripSchema,
  updateTripSchema,
  itineraryUpdateSchema,
  tripStatusSchema,
  tripDaySchema,
  itineraryStopSchema,
} from "./trip.validator";
export type {
  CreateTripInput,
  UpdateTripInput,
  ItineraryUpdateInput,
  ItineraryStopInput,
  TripDayInput,
} from "./trip.validator";

export {
  createTripPackageSchema,
  updateTripPackageSchema,
  tripPackageQuerySchema,
  tripPackageStatusSchema,
} from "./trip-package.validator";
export type {
  CreateTripPackageInput,
  UpdateTripPackageInput,
} from "./trip-package.validator";

export {
  createBookingSchema,
  updateBookingSchema,
  bookingStatusSchema,
  bookingPaymentStatusSchema,
} from "./booking.validator";
export type { CreateBookingInput, UpdateBookingInput } from "./booking.validator";

export {
  createPaymentSchema,
  updatePaymentSchema,
  paymentMethodSchema,
  paymentRecordStatusSchema,
} from "./payment.validator";
export type { CreatePaymentInput, UpdatePaymentInput } from "./payment.validator";

export { createReviewSchema, updateReviewSchema } from "./review.validator";
export type { CreateReviewInput, UpdateReviewInput } from "./review.validator";

export { createFavoriteSchema, favoriteParamsSchema } from "./favorite.validator";
export type { CreateFavoriteInput } from "./favorite.validator";

export {
  createNotificationSchema,
  updateNotificationSchema,
  notificationTypeSchema,
} from "./notification.validator";
export type {
  CreateNotificationInput,
  UpdateNotificationInput,
} from "./notification.validator";

export {
  createChecklistSchema,
  updateChecklistSchema,
  checklistItemSchema,
  toggleChecklistItemSchema,
} from "./checklist.validator";
export type {
  CreateChecklistInput,
  UpdateChecklistInput,
  ToggleChecklistItemInput,
} from "./checklist.validator";

export {
  createExpenseSchema,
  updateExpenseSchema,
  expenseCategorySchema,
} from "./expense.validator";
export type { CreateExpenseInput, UpdateExpenseInput } from "./expense.validator";

export {
  createVisitedPlaceSchema,
  updateVisitedPlaceSchema,
} from "./visitedPlace.validator";
export type {
  CreateVisitedPlaceInput,
  UpdateVisitedPlaceInput,
} from "./visitedPlace.validator";
