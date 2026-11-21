import { CustomError } from '../../utils/errorHandler.js';

class EngagementService {
  constructor(models, connection) {
    this.Product = models.Product;
    this.ProductReview = models.ProductReview;
    this.ProductQuestion = models.ProductQuestion;
    this.Client = models.Client;
    this.Order = models.Order;
    this.OrderItem = models.OrderItem;
    this.User = models.User;
    this.connection = connection;
  }

  static buildHistogram(reviews) {
    const histogram = {
      5: 0, 4: 0, 3: 0, 2: 0, 1: 0,
    };
    let sum = 0;

    reviews.forEach((r) => {
      const rating = Number(r.rating);
      if (rating >= 1 && rating <= 5) {
        histogram[rating] += 1;
        sum += rating;
      }
    });

    const total = reviews.length;
    const average = total > 0 ? Number((sum / total).toFixed(2)) : 0;

    return { histogram, total, average };
  }

  async recomputeProductRating(productId, transaction = null) {
    const approved = await this.ProductReview.findAll({
      where: { productId, status: 'Approved' },
      attributes: ['rating'],
      ...(transaction ? { transaction } : {}),
    });

    const { average, total } = EngagementService.buildHistogram(approved);

    await this.Product.update(
      { ratingAvg: average, ratingCount: total },
      { where: { productId }, ...(transaction ? { transaction } : {}) },
    );

    return { ratingAvg: average, ratingCount: total };
  }

  async hasVerifiedDeliveredPurchase(userId, productId, transaction = null) {
    if (!userId || !this.Client || !this.Order || !this.OrderItem) {
      return { verified: false, clientId: null };
    }

    const client = await this.Client.findOne({
      where: { userId },
      ...(transaction ? { transaction } : {}),
    });
    if (!client) return { verified: false, clientId: null };

    const deliveredOrder = await this.Order.findOne({
      where: { clientId: client.clientId, status: 'Delivered' },
      include: [
        {
          model: this.OrderItem,
          where: { productId },
          required: true,
        },
      ],
      ...(transaction ? { transaction } : {}),
    });

    return { verified: Boolean(deliveredOrder), clientId: client.clientId };
  }

  async getProductReviews(productId, { includeAll = false } = {}) {
    const product = await this.Product.findByPk(productId);
    if (!product) throw new CustomError('Product not found.', 404);

    const where = { productId };
    if (!includeAll) where.status = 'Approved';

    const reviews = await this.ProductReview.findAll({
      where,
      order: [['verifiedPurchase', 'DESC'], ['helpfulVotes', 'DESC'], ['reviewId', 'DESC']],
    });

    const approvedReviews = includeAll
      ? reviews.filter((r) => r.status === 'Approved')
      : reviews;

    const { histogram, total, average } = EngagementService.buildHistogram(approvedReviews);

    return {
      reviews: reviews.map((r) => (r.toDict ? r.toDict() : r)),
      summary: {
        ratingAvg: average,
        ratingCount: total,
        histogram,
      },
    };
  }

  async createReview(productId, user, payload) {
    return this.connection.transaction(async (transaction) => {
      const product = await this.Product.findByPk(productId, { transaction });
      if (!product) throw new CustomError('Product not found.', 404);

      const dbUser = this.User ? await this.User.findByPk(user.id, { transaction }) : null;
      const authorName = dbUser?.name || user.email || 'Customer';

      const { verified, clientId } = await this.hasVerifiedDeliveredPurchase(
        user.id,
        productId,
        transaction,
      );

      const review = await this.ProductReview.create(
        {
          productId: Number(productId),
          userId: user.id,
          clientId,
          authorName,
          rating: Number(payload.rating),
          title: payload.title,
          comment: payload.comment,
          verifiedPurchase: verified,
          status: 'Approved',
        },
        { transaction },
      );

      const stats = await this.recomputeProductRating(productId, transaction);

      return {
        review: review.toDict ? review.toDict() : review,
        ratingSummary: stats,
      };
    });
  }

  async markReviewHelpful(productId, reviewId) {
    const review = await this.ProductReview.findOne({
      where: { reviewId, productId, status: 'Approved' },
    });
    if (!review) throw new CustomError('Review not found.', 404);

    const updated = await review.update({ helpfulVotes: (review.helpfulVotes || 0) + 1 });
    return updated.toDict ? updated.toDict() : updated;
  }

  async listAllReviews({ status, productId } = {}) {
    const where = {};
    if (status) where.status = status;
    if (productId) where.productId = Number(productId);

    return this.ProductReview.findAll({
      where,
      include: [
        {
          model: this.Product,
          attributes: ['productId', 'productName', 'category'],
          required: false,
        },
      ],
      order: [['reviewId', 'DESC']],
    });
  }

  async updateReviewStatus(reviewId, status) {
    return this.connection.transaction(async (transaction) => {
      const review = await this.ProductReview.findByPk(reviewId, { transaction });
      if (!review) throw new CustomError('Review not found.', 404);

      await review.update({ status }, { transaction });
      const stats = await this.recomputeProductRating(review.productId, transaction);

      return {
        review: review.toDict ? review.toDict() : review,
        ratingSummary: stats,
      };
    });
  }

  async getProductQuestions(productId, { includeHidden = false } = {}) {
    const product = await this.Product.findByPk(productId);
    if (!product) throw new CustomError('Product not found.', 404);

    const where = { productId };
    if (!includeHidden) where.status = 'Published';

    const questions = await this.ProductQuestion.findAll({
      where,
      order: [['questionId', 'DESC']],
    });

    return questions.map((q) => (q.toDict ? q.toDict() : q));
  }

  async createQuestion(productId, user, payload) {
    const product = await this.Product.findByPk(productId);
    if (!product) throw new CustomError('Product not found.', 404);

    const dbUser = this.User ? await this.User.findByPk(user.id) : null;
    const authorName = dbUser?.name || user.email || 'Customer';

    const created = await this.ProductQuestion.create({
      productId: Number(productId),
      userId: user.id,
      authorName,
      question: payload.question,
      status: 'Published',
    });

    return created.toDict ? created.toDict() : created;
  }

  async listAllQuestions({ unansweredOnly = false, status } = {}) {
    const where = {};
    if (status) where.status = status;
    if (unansweredOnly) where.answer = null;

    return this.ProductQuestion.findAll({
      where,
      include: [
        {
          model: this.Product,
          attributes: ['productId', 'productName', 'category'],
          required: false,
        },
      ],
      order: [['questionId', 'DESC']],
    });
  }

  async answerQuestion(questionId, adminUser, answerText) {
    const question = await this.ProductQuestion.findByPk(questionId);
    if (!question) throw new CustomError('Question not found.', 404);

    const dbUser = this.User ? await this.User.findByPk(adminUser.id) : null;
    const answeredByName = dbUser?.name || adminUser.email || 'Store Team';

    const updated = await question.update({
      answer: answerText,
      answeredByUserId: adminUser.id,
      answeredByName,
      answeredAt: new Date(),
    });

    return updated.toDict ? updated.toDict() : updated;
  }

  async updateQuestionStatus(questionId, status) {
    const question = await this.ProductQuestion.findByPk(questionId);
    if (!question) throw new CustomError('Question not found.', 404);

    const updated = await question.update({ status });
    return updated.toDict ? updated.toDict() : updated;
  }
}

export default EngagementService;
