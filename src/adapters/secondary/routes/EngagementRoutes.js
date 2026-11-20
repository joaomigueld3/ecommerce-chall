import express from 'express';
import { requireAdmin } from '../../../utils/middlewareAuth.js';
import Product from '../../../entities/models/Product.js';
import ProductReview from '../../../entities/models/ProductReview.js';
import ProductQuestion from '../../../entities/models/ProductQuestion.js';
import Client from '../../../entities/models/Client.js';
import Order from '../../../entities/models/Order.js';
import OrderItem from '../../../entities/models/OrderItem.js';
import User from '../../../entities/models/User.js';
import EngagementService from '../../../entities/services/EngagementService.js';
import EngagementController from '../../primary/controllers/EngagementController.js';
import CatalogValidation from '../../../validation/CatalogValidation.js';
import connection from '../../../database/index.js';

const engagementService = new EngagementService(
  {
    Product, ProductReview, ProductQuestion, Client, Order, OrderItem, User,
  },
  connection,
);
const engagementController = new EngagementController(engagementService);

const reviewAdminRouter = express.Router();
reviewAdminRouter.get('/', requireAdmin, engagementController.listAllReviews.bind(engagementController));
reviewAdminRouter.patch('/:reviewId/status', requireAdmin, CatalogValidation.updateReviewStatusSchema, engagementController.updateReviewStatus.bind(engagementController));

const questionAdminRouter = express.Router();
questionAdminRouter.get('/', requireAdmin, engagementController.listAllQuestions.bind(engagementController));
questionAdminRouter.patch('/:questionId/answer', requireAdmin, CatalogValidation.answerQuestionSchema, engagementController.answerQuestion.bind(engagementController));
questionAdminRouter.patch('/:questionId/status', requireAdmin, CatalogValidation.updateQuestionStatusSchema, engagementController.updateQuestionStatus.bind(engagementController));

export { reviewAdminRouter, questionAdminRouter, engagementController };
