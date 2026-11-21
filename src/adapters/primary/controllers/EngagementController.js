import { errorHandler } from '../../../utils/errorHandler.js';

class EngagementController {
  constructor(engagementService) {
    this.engagementService = engagementService;
  }

  async getProductReviews(req, res) {
    try {
      const includeAll = req.user?.type === 'Admin' && req.query.includeAll === 'true';
      const data = await this.engagementService.getProductReviews(req.params.productId, { includeAll });
      return res.status(200).json(data);
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createReview(req, res) {
    try {
      const result = await this.engagementService.createReview(
        req.params.productId,
        req.user,
        req.body,
      );
      return res.status(201).json({
        message: 'Review submitted successfully.',
        ...result,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async markReviewHelpful(req, res) {
    try {
      const review = await this.engagementService.markReviewHelpful(
        req.params.productId,
        req.params.reviewId,
      );
      return res.status(200).json({ message: 'Helpful vote recorded.', review });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async listAllReviews(req, res) {
    try {
      const reviews = await this.engagementService.listAllReviews({
        status: req.query.status,
        productId: req.query.productId,
      });
      return res.status(200).json({ reviews });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateReviewStatus(req, res) {
    try {
      const result = await this.engagementService.updateReviewStatus(
        req.params.reviewId,
        req.body.status,
      );
      return res.status(200).json({
        message: 'Review status updated.',
        ...result,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async getProductQuestions(req, res) {
    try {
      const includeHidden = req.user?.type === 'Admin' && req.query.includeHidden === 'true';
      const questions = await this.engagementService.getProductQuestions(
        req.params.productId,
        { includeHidden },
      );
      return res.status(200).json({ questions });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async createQuestion(req, res) {
    try {
      const question = await this.engagementService.createQuestion(
        req.params.productId,
        req.user,
        req.body,
      );
      return res.status(201).json({
        message: 'Question submitted successfully.',
        question,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async listAllQuestions(req, res) {
    try {
      const questions = await this.engagementService.listAllQuestions({
        unansweredOnly: req.query.unanswered === 'true',
        status: req.query.status,
      });
      return res.status(200).json({ questions });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async answerQuestion(req, res) {
    try {
      const question = await this.engagementService.answerQuestion(
        req.params.questionId,
        req.user,
        req.body.answer,
      );
      return res.status(200).json({
        message: 'Question answered successfully.',
        question,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }

  async updateQuestionStatus(req, res) {
    try {
      const question = await this.engagementService.updateQuestionStatus(
        req.params.questionId,
        req.body.status,
      );
      return res.status(200).json({
        message: 'Question status updated.',
        question,
      });
    } catch (e) {
      return errorHandler(e, res);
    }
  }
}

export default EngagementController;
