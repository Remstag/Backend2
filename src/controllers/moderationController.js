const Post = require("../models/PostModel");
const Media = require("../models/MediaModel");
const { success, error } = require("../utils/responseHandler");

/**
 * Lấy danh sách nội dung đang chờ duyệt (Pending)
 * Gộp cả Posts và Media
 */
exports.getPending = async (req, res, next) => {
    try {
        const pendingPosts = await Post.find({ status: "pending" })
            .populate("user_id", "fullName email")
            .sort({ createdAt: -1 });

        const pendingMedia = await Media.find({ status: "pending" })
            .populate("uploadedBy", "fullName email")
            .sort({ createdAt: -1 });

        // Map về định dạng chung cho Frontend
        const items = [
            ...pendingPosts.map(p => ({
                id: p._id,
                type: "post",
                content: p.content,
                image: p.image_url,
                user: p.user_id?.fullName || "Ẩn danh",
                time: p.createdAt,
                status: p.status
            })),
            ...pendingMedia.map(m => ({
                id: m._id,
                type: m.kind || "image",
                content: m.caption || `Tệp tin: ${m.originalName}`,
                image: `/storage/${m.storagePath}`,
                user: m.uploadedBy?.fullName || "Ẩn danh",
                time: m.createdAt,
                status: m.status
            }))
        ];

        // Sắp xếp theo thời gian mới nhất
        items.sort((a, b) => new Date(b.time) - new Date(a.time));

        return success(res, items);
    } catch (err) {
        next(err);
    }
};

/**
 * Cập nhật trạng thái duyệt
 */
exports.updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // approved | rejected

        if (!["approved", "rejected"].includes(status)) {
            return error(res, "Trạng thái không hợp lệ", 400);
        }

        // Thử tìm trong Post
        let item = await Post.findById(id);
        if (item) {
            item.status = status;
            await item.save();
            return success(res, { message: "Đã cập nhật trạng thái bài viết", status: item.status });
        }

        // Nếu không có trong Post, thử tìm trong Media
        item = await Media.findById(id);
        if (item) {
            item.status = status;
            await item.save();
            return success(res, { message: "Đã cập nhật trạng thái truyền thông", status: item.status });
        }

        return error(res, "Không tìm thấy nội dung yêu cầu", 404);
    } catch (err) {
        next(err);
    }
};
