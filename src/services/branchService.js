const branchRepository = require('../repositories/branchRepository');
const ApiError = require('../utils/ApiError');

class BranchService {
  async getAllBranches({ page, limit, search, status, city }) {
    return branchRepository.findAll({ page, limit, search, status, city });
  }
  
  async getBranchById(id) {
    const branch = await branchRepository.findById(id);
    
    if (!branch) {
      throw ApiError.notFound('Branch not found');
    }
    
    return branch;
  }
  
  async createBranch(data, adminId) {
    // Validate
    if (!data.name || !data.code || !data.city || !data.address || !data.phone) {
      throw ApiError.badRequest('Name, code, city, address, and phone are required');
    }
    
    // Check duplicate code
    const existing = await branchRepository.findByCode(data.code.toUpperCase());
    if (existing) {
      throw ApiError.conflict('Branch code already exists');
    }
    
    // Create
    const branch = await branchRepository.create({
      ...data,
      code: data.code.toUpperCase(),
      is_active: true,
    });
    
    // Audit log
    await branchRepository.logAudit({
      userId: adminId,
      action: 'BRANCH_CREATED',
      tableName: 'branches',
      recordId: branch.id,
      newValue: branch,
    });
    
    return branch;
  }
  
  async updateBranch(id, data, adminId) {
    const branch = await branchRepository.findById(id);
    
    if (!branch) {
      throw ApiError.notFound('Branch not found');
    }
    
    const updated = await branchRepository.update(id, data);
    
    await branchRepository.logAudit({
      userId: adminId,
      action: 'BRANCH_UPDATED',
      tableName: 'branches',
      recordId: id,
      oldValue: branch,
      newValue: updated,
    });
    
    return updated;
  }
  
  async suspendBranch(id, reason, adminId) {
    if (!reason) {
      throw ApiError.badRequest('Suspension reason required');
    }
    
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw ApiError.notFound('Branch not found');
    }
    
    const suspended = await branchRepository.suspend(id, reason);
    
    await branchRepository.logAudit({
      userId: adminId,
      action: 'BRANCH_SUSPENDED',
      tableName: 'branches',
      recordId: id,
      oldValue: branch,
      newValue: suspended,
    });
    
    return suspended;
  }
  
  async activateBranch(id, adminId) {
    const branch = await branchRepository.findById(id);
    if (!branch) {
      throw ApiError.notFound('Branch not found');
    }
    
    const activated = await branchRepository.activate(id);
    
    await branchRepository.logAudit({
      userId: adminId,
      action: 'BRANCH_ACTIVATED',
      tableName: 'branches',
      recordId: id,
      oldValue: branch,
      newValue: activated,
    });
    
    return activated;
  }
}

module.exports = new BranchService();