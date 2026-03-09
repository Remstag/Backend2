const Branch = require("../models/BranchModel");

exports.checkPrivacy = async (resource, user) => {
    // Public is always visible
    if (resource.privacy === "public") return true;

    // Must be logged in for anything else
    if (!user) return false;

    // Global Admin sees everything
    if (user.role === "admin") return true;

    // If it has a branch, check membership
    if (resource.branchId) {
        const branch = await Branch.findById(resource.branchId);
        if (!branch) return false;

        const uid = user.id || user._id; // depending on payload
        const isOwner = branch.ownerId && branch.ownerId.toString() === uid.toString();
        const isMember = branch.members.some(m => m.userId.toString() === uid.toString());

        if (isOwner) return true;

        if (resource.privacy === "internal" && isMember) return true;

        if (resource.privacy === "sensitive") {
            // For sensitive, maybe only editors/owners can see? 
            // Let's allow branch editors/owners for sensitive.
            const member = branch.members.find(m => m.userId.toString() === uid.toString());
            if (member && (member.roleInBranch === "editor" || member.roleInBranch === "owner")) return true;
        }
    }

    return false;
};