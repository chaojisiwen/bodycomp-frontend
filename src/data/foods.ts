// 食物营养数据库 - 精选200种常见食物（数据基于每100g/ml的可食用部分）

export interface FoodItem {
  id: string
  name: string
  emoji: string
  category: string
  // 每100g/ml营养数据
  calories: number      // 千卡
  protein: number       // 蛋白质 (g)
  fat: number          // 脂肪 (g)
  carbs: number        // 碳水化合物 (g)
  fiber: number        // 膳食纤维 (g)
  gi: number           // 血糖生成指数
  gl: number           // 血糖负荷
  unit: string         // 单位 g/ml
  defaultAmount: number // 默认份量
}

export const foodDatabase: FoodItem[] = [
  // ========== 水果 ==========
  { id: 'f001', name: '苹果', emoji: '🍎', category: '水果', calories: 52, protein: 0.3, fat: 0.2, carbs: 14, fiber: 2.4, gi: 36, gl: 5, unit: 'g', defaultAmount: 180 },
  { id: 'f002', name: '香蕉', emoji: '🍌', category: '水果', calories: 89, protein: 1.1, fat: 0.2, carbs: 23, fiber: 2.6, gi: 51, gl: 12, unit: 'g', defaultAmount: 120 },
  { id: 'f003', name: '橙子', emoji: '🍊', category: '水果', calories: 47, protein: 0.9, fat: 0.1, carbs: 12, fiber: 2.4, gi: 43, gl: 5, unit: 'g', defaultAmount: 150 },
  { id: 'f004', name: '葡萄', emoji: '🍇', category: '水果', calories: 67, protein: 0.6, fat: 0.2, carbs: 17, fiber: 0.9, gi: 59, gl: 10, unit: 'g', defaultAmount: 100 },
  { id: 'f005', name: '西瓜', emoji: '🍉', category: '水果', calories: 30, protein: 0.6, fat: 0.1, carbs: 8, fiber: 0.4, gi: 72, gl: 4, unit: 'g', defaultAmount: 300 },
  { id: 'f006', name: '草莓', emoji: '🍓', category: '水果', calories: 32, protein: 0.7, fat: 0.3, carbs: 8, fiber: 2.0, gi: 40, gl: 2, unit: 'g', defaultAmount: 100 },
  { id: 'f007', name: '蓝莓', emoji: '🫐', category: '水果', calories: 57, protein: 0.7, fat: 0.3, carbs: 14, fiber: 2.4, gi: 53, gl: 6, unit: 'g', defaultAmount: 125 },
  { id: 'f008', name: '猕猴桃', emoji: '🥝', category: '水果', calories: 61, protein: 1.1, fat: 0.5, carbs: 15, fiber: 2.6, gi: 50, gl: 7, unit: 'g', defaultAmount: 80 },
  { id: 'f009', name: '芒果', emoji: '🥭', category: '水果', calories: 60, protein: 0.8, fat: 0.4, carbs: 15, fiber: 1.8, gi: 55, gl: 8, unit: 'g', defaultAmount: 200 },
  { id: 'f010', name: '菠萝', emoji: '🍍', category: '水果', calories: 50, protein: 0.5, fat: 0.1, carbs: 13, fiber: 1.4, gi: 59, gl: 6, unit: 'g', defaultAmount: 200 },
  { id: 'f011', name: '柚子', emoji: '🍊', category: '水果', calories: 42, protein: 0.8, fat: 0.2, carbs: 10, fiber: 1.0, gi: 25, gl: 3, unit: 'g', defaultAmount: 150 },
  { id: 'f012', name: '梨', emoji: '🍐', category: '水果', calories: 51, protein: 0.4, fat: 0.1, carbs: 13, fiber: 3.1, gi: 38, gl: 4, unit: 'g', defaultAmount: 180 },
  { id: 'f013', name: '桃子', emoji: '🍑', category: '水果', calories: 39, protein: 0.9, fat: 0.3, carbs: 10, fiber: 1.5, gi: 42, gl: 3, unit: 'g', defaultAmount: 150 },
  { id: 'f014', name: '樱桃', emoji: '🍒', category: '水果', calories: 63, protein: 1.1, fat: 0.2, carbs: 16, fiber: 2.1, gi: 22, gl: 3, unit: 'g', defaultAmount: 100 },
  { id: 'f015', name: '火龙果', emoji: '🐉', category: '水果', calories: 50, protein: 1.1, fat: 0.2, carbs: 13, fiber: 2.0, gi: 50, gl: 8, unit: 'g', defaultAmount: 250 },

  // ========== 蔬菜 ==========
  { id: 'f016', name: '西红柿', emoji: '🍅', category: '蔬菜', calories: 18, protein: 0.9, fat: 0.2, carbs: 4, fiber: 1.2, gi: 15, gl: 1, unit: 'g', defaultAmount: 150 },
  { id: 'f017', name: '黄瓜', emoji: '🥒', category: '蔬菜', calories: 15, protein: 0.7, fat: 0.1, carbs: 3, fiber: 0.5, gi: 15, gl: 1, unit: 'g', defaultAmount: 200 },
  { id: 'f018', name: '生菜', emoji: '🥬', category: '蔬菜', calories: 15, protein: 1.4, fat: 0.2, carbs: 3, fiber: 1.3, gi: 15, gl: 1, unit: 'g', defaultAmount: 100 },
  { id: 'f019', name: '菠菜', emoji: '🥬', category: '蔬菜', calories: 23, protein: 2.9, fat: 0.4, carbs: 3, fiber: 2.2, gi: 15, gl: 1, unit: 'g', defaultAmount: 100 },
  { id: 'f020', name: '西兰花', emoji: '🥦', category: '蔬菜', calories: 34, protein: 2.8, fat: 0.4, carbs: 7, fiber: 2.6, gi: 15, gl: 1, unit: 'g', defaultAmount: 150 },
  { id: 'f021', name: '白菜', emoji: '🥬', category: '蔬菜', calories: 21, protein: 1.5, fat: 0.3, carbs: 4, fiber: 1.0, gi: 15, gl: 1, unit: 'g', defaultAmount: 200 },
  { id: 'f022', name: '土豆', emoji: '🥔', category: '蔬菜', calories: 76, protein: 2.0, fat: 0.1, carbs: 17, fiber: 2.2, gi: 62, gl: 11, unit: 'g', defaultAmount: 150 },
  { id: 'f023', name: '红薯', emoji: '🍠', category: '蔬菜', calories: 99, protein: 1.6, fat: 0.1, carbs: 24, fiber: 3.0, gi: 54, gl: 11, unit: 'g', defaultAmount: 200 },
  { id: 'f024', name: '胡萝卜', emoji: '🥕', category: '蔬菜', calories: 41, protein: 0.9, fat: 0.2, carbs: 10, fiber: 2.8, gi: 39, gl: 2, unit: 'g', defaultAmount: 100 },
  { id: 'f025', name: '白萝卜', emoji: '🥕', category: '蔬菜', calories: 16, protein: 0.6, fat: 0.1, carbs: 4, fiber: 1.0, gi: 15, gl: 1, unit: 'g', defaultAmount: 200 },
  { id: 'f026', name: '洋葱', emoji: '🧅', category: '蔬菜', calories: 40, protein: 1.1, fat: 0.1, carbs: 9, fiber: 1.7, gi: 15, gl: 1, unit: 'g', defaultAmount: 100 },
  { id: 'f027', name: '青椒', emoji: '🫑', category: '蔬菜', calories: 22, protein: 1.0, fat: 0.2, carbs: 5, fiber: 1.8, gi: 15, gl: 1, unit: 'g', defaultAmount: 80 },
  { id: 'f028', name: '茄子', emoji: '🍆', category: '蔬菜', calories: 21, protein: 1.0, fat: 0.2, carbs: 5, fiber: 1.3, gi: 15, gl: 1, unit: 'g', defaultAmount: 200 },
  { id: 'f029', name: '南瓜', emoji: '🎃', category: '蔬菜', calories: 26, protein: 1.0, fat: 0.1, carbs: 6, fiber: 0.5, gi: 75, gl: 3, unit: 'g', defaultAmount: 200 },
  { id: 'f030', name: '冬瓜', emoji: '🍈', category: '蔬菜', calories: 11, protein: 0.4, fat: 0, carbs: 3, fiber: 0.4, gi: 15, gl: 1, unit: 'g', defaultAmount: 300 },
  { id: 'f031', name: '莲藕', emoji: '🥯', category: '蔬菜', calories: 73, protein: 1.9, fat: 0.1, carbs: 17, fiber: 4.9, gi: 38, gl: 6, unit: 'g', defaultAmount: 100 },
  { id: 'f032', name: '山药', emoji: '🥔', category: '蔬菜', calories: 56, protein: 1.5, fat: 0.1, carbs: 13, fiber: 0.8, gi: 51, gl: 6, unit: 'g', defaultAmount: 150 },
  { id: 'f033', name: '金针菇', emoji: '🍄', category: '蔬菜', calories: 32, protein: 2.7, fat: 0.2, carbs: 6, fiber: 2.7, gi: 15, gl: 1, unit: 'g', defaultAmount: 100 },
  { id: 'f034', name: '香菇', emoji: '🍄', category: '蔬菜', calories: 35, protein: 2.8, fat: 0.3, carbs: 6, fiber: 3.3, gi: 15, gl: 1, unit: 'g', defaultAmount: 100 },
  { id: 'f035', name: '木耳', emoji: '🍄', category: '蔬菜', calories: 27, protein: 1.5, fat: 0.2, carbs: 6, fiber: 2.6, gi: 15, gl: 1, unit: 'g', defaultAmount: 50 },

  // ========== 肉类 ==========
  { id: 'f036', name: '鸡胸肉', emoji: '🍗', category: '肉类', calories: 133, protein: 31, fat: 3.6, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f037', name: '鸡腿肉', emoji: '🍗', category: '肉类', calories: 195, protein: 26, fat: 10, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 120 },
  { id: 'f038', name: '鸡翅', emoji: '🍗', category: '肉类', calories: 222, protein: 26, fat: 12, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f039', name: '猪肉(瘦肉)', emoji: '🥩', category: '肉类', calories: 143, protein: 27, fat: 4, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f040', name: '猪里脊', emoji: '🥩', category: '肉类', calories: 120, protein: 23, fat: 3, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f041', name: '猪五花', emoji: '🥓', category: '肉类', calories: 395, protein: 14, fat: 37, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f042', name: '猪排骨', emoji: '🍖', category: '肉类', calories: 278, protein: 21, fat: 21, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f043', name: '牛肉(瘦肉)', emoji: '🥩', category: '肉类', calories: 125, protein: 26, fat: 3, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f044', name: '牛里脊', emoji: '🥩', category: '肉类', calories: 118, protein: 22, fat: 3, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f045', name: '牛腩', emoji: '🥩', category: '肉类', calories: 217, protein: 20, fat: 15, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f046', name: '牛排', emoji: '🥩', category: '肉类', calories: 200, protein: 26, fat: 10, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 200 },
  { id: 'f047', name: '羊肉(瘦肉)', emoji: '🥩', category: '肉类', calories: 118, protein: 23, fat: 3, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f048', name: '培根', emoji: '🥓', category: '肉类', calories: 458, protein: 15, fat: 42, carbs: 1, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 50 },
  { id: 'f049', name: '火腿', emoji: '🍖', category: '肉类', calories: 145, protein: 21, fat: 6, carbs: 1, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f050', name: '香肠', emoji: '🌭', category: '肉类', calories: 290, protein: 12, fat: 24, carbs: 4, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },

  // ========== 海鲜 ==========
  { id: 'f051', name: '三文鱼', emoji: '🐟', category: '海鲜', calories: 183, protein: 22, fat: 10, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f052', name: '金枪鱼', emoji: '🐟', category: '海鲜', calories: 130, protein: 29, fat: 1, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f053', name: '鳕鱼', emoji: '🐟', category: '海鲜', calories: 82, protein: 18, fat: 1, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f054', name: '虾', emoji: '🦐', category: '海鲜', calories: 85, protein: 18, fat: 1, carbs: 1, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f055', name: '龙虾', emoji: '🦞', category: '海鲜', calories: 89, protein: 19, fat: 1, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 200 },
  { id: 'f056', name: '大闸蟹', emoji: '🦀', category: '海鲜', calories: 103, protein: 17, fat: 3, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f057', name: '扇贝', emoji: '🐚', category: '海鲜', calories: 100, protein: 21, fat: 1, carbs: 3, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f058', name: '生蚝', emoji: '🦪', category: '海鲜', calories: 68, protein: 10, fat: 2, carbs: 4, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f059', name: '鲍鱼', emoji: '🐚', category: '海鲜', calories: 84, protein: 17, fat: 1, carbs: 3, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 50 },
  { id: 'f060', name: '海参', emoji: '🥒', category: '海鲜', calories: 78, protein: 17, fat: 1, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 50 },

  // ========== 蛋类 ==========
  { id: 'f061', name: '鸡蛋', emoji: '🥚', category: '蛋类', calories: 144, protein: 13, fat: 10, carbs: 1, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 50 },
  { id: 'f062', name: '蛋白', emoji: '🥚', category: '蛋类', calories: 52, protein: 11, fat: 0.2, carbs: 1, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 70 },
  { id: 'f063', name: '蛋黄', emoji: '🥚', category: '蛋类', calories: 322, protein: 16, fat: 27, carbs: 3, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 15 },
  { id: 'f064', name: '鸭蛋', emoji: '🥚', category: '蛋类', calories: 180, protein: 13, fat: 14, carbs: 1, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 60 },
  { id: 'f065', name: '鹌鹑蛋', emoji: '🥚', category: '蛋类', calories: 160, protein: 13, fat: 11, carbs: 1, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 50 },

  // ========== 奶类 ==========
  { id: 'f066', name: '纯牛奶', emoji: '🥛', category: '奶类', calories: 61, protein: 3.2, fat: 3.3, carbs: 5, fiber: 0, gi: 27, gl: 3, unit: 'ml', defaultAmount: 250 },
  { id: 'f067', name: '脱脂牛奶', emoji: '🥛', category: '奶类', calories: 34, protein: 3.4, fat: 0.2, carbs: 5, fiber: 0, gi: 27, gl: 2, unit: 'ml', defaultAmount: 250 },
  { id: 'f068', name: '酸奶', emoji: '🥛', category: '奶类', calories: 72, protein: 2.9, fat: 2.7, carbs: 9, fiber: 0, gi: 36, gl: 3, unit: 'ml', defaultAmount: 200 },
  { id: 'f069', name: '奶酪', emoji: '🧀', category: '奶类', calories: 328, protein: 25, fat: 24, carbs: 3, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 30 },
  { id: 'f070', name: '黄油', emoji: '🧈', category: '奶类', calories: 717, protein: 1, fat: 81, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 10 },
  { id: 'f071', name: '淡奶油', emoji: '🥛', category: '奶类', calories: 340, protein: 2, fat: 36, carbs: 3, fiber: 0, gi: 0, gl: 0, unit: 'ml', defaultAmount: 30 },

  // ========== 谷物 ==========
  { id: 'f072', name: '米饭', emoji: '🍚', category: '谷物', calories: 116, protein: 2.6, fat: 0.3, carbs: 26, fiber: 0.3, gi: 73, gl: 23, unit: 'g', defaultAmount: 200 },
  { id: 'f073', name: '糙米饭', emoji: '🍚', category: '谷物', calories: 111, protein: 2.6, fat: 0.9, carbs: 23, fiber: 1.8, gi: 68, gl: 16, unit: 'g', defaultAmount: 200 },
  { id: 'f074', name: '燕麦', emoji: '🌾', category: '谷物', calories: 389, protein: 17, fat: 7, carbs: 66, fiber: 10, gi: 55, gl: 13, unit: 'g', defaultAmount: 50 },
  { id: 'f075', name: '藜麦', emoji: '🌾', category: '谷物', calories: 120, protein: 4.4, fat: 1.9, carbs: 21, fiber: 2.8, gi: 53, gl: 10, unit: 'g', defaultAmount: 100 },
  { id: 'f076', name: '面条', emoji: '🍜', category: '谷物', calories: 130, protein: 5, fat: 1.1, carbs: 25, fiber: 1.2, gi: 47, gl: 26, unit: 'g', defaultAmount: 150 },
  { id: 'f077', name: '方便面', emoji: '🍜', category: '谷物', calories: 436, protein: 10, fat: 17, carbs: 62, fiber: 2.3, gi: 65, gl: 40, unit: 'g', defaultAmount: 100 },
  { id: 'f078', name: '馒头', emoji: '🥖', category: '谷物', calories: 223, protein: 7, fat: 1, carbs: 47, fiber: 1.3, gi: 88, gl: 42, unit: 'g', defaultAmount: 100 },
  { id: 'f079', name: '包子', emoji: '🥟', category: '谷物', calories: 227, protein: 8, fat: 6, carbs: 36, fiber: 1.2, gi: 70, gl: 25, unit: 'g', defaultAmount: 160 },
  { id: 'f080', name: '饺子', emoji: '🥟', category: '谷物', calories: 242, protein: 10, fat: 8, carbs: 34, fiber: 1.2, gi: 60, gl: 20, unit: 'g', defaultAmount: 150 },

  // ========== 面包 ==========
  { id: 'f081', name: '白面包', emoji: '🍞', category: '面包', calories: 265, protein: 9, fat: 3, carbs: 49, fiber: 2.7, gi: 75, gl: 37, unit: 'g', defaultAmount: 100 },
  { id: 'f082', name: '全麦面包', emoji: '🍞', category: '面包', calories: 247, protein: 13, fat: 3, carbs: 41, fiber: 6.0, gi: 54, gl: 9, unit: 'g', defaultAmount: 100 },
  { id: 'f083', name: '吐司', emoji: '🍞', category: '面包', calories: 276, protein: 9, fat: 4, carbs: 51, fiber: 2.3, gi: 73, gl: 21, unit: 'g', defaultAmount: 100 },
  { id: 'f084', name: '贝果', emoji: '🥯', category: '面包', calories: 250, protein: 10, fat: 1.5, carbs: 48, fiber: 2.4, gi: 69, gl: 33, unit: 'g', defaultAmount: 100 },
  { id: 'f085', name: '可颂', emoji: '🥐', category: '面包', calories: 406, protein: 8, fat: 21, carbs: 45, fiber: 2.4, gi: 67, gl: 30, unit: 'g', defaultAmount: 60 },
  { id: 'f086', name: '甜甜圈', emoji: '🍩', category: '面包', calories: 452, protein: 5, fat: 25, carbs: 51, fiber: 1.8, gi: 76, gl: 39, unit: 'g', defaultAmount: 70 },
  { id: 'f087', name: '华夫饼', emoji: '🧇', category: '面包', calories: 291, protein: 7, fat: 11, carbs: 43, fiber: 1.5, gi: 76, gl: 33, unit: 'g', defaultAmount: 75 },

  // ========== 豆类 ==========
  { id: 'f088', name: '豆腐', emoji: '🧈', category: '豆类', calories: 81, protein: 8, fat: 4, carbs: 4, fiber: 0.4, gi: 15, gl: 1, unit: 'g', defaultAmount: 150 },
  { id: 'f089', name: '豆干', emoji: '🧈', category: '豆类', calories: 140, protein: 17, fat: 8, carbs: 2, fiber: 0.8, gi: 15, gl: 1, unit: 'g', defaultAmount: 100 },
  { id: 'f090', name: '豆浆', emoji: '🥛', category: '豆类', calories: 33, protein: 3, fat: 1.5, carbs: 2, fiber: 0.5, gi: 15, gl: 1, unit: 'ml', defaultAmount: 300 },
  { id: 'f091', name: '毛豆', emoji: '🫘', category: '豆类', calories: 131, protein: 13, fat: 5, carbs: 10, fiber: 5.0, gi: 15, gl: 1, unit: 'g', defaultAmount: 100 },
  { id: 'f092', name: '纳豆', emoji: '🫘', category: '豆类', calories: 212, protein: 17, fat: 11, carbs: 14, fiber: 5.4, gi: 35, gl: 5, unit: 'g', defaultAmount: 50 },

  // ========== 坚果 ==========
  { id: 'f093', name: '杏仁', emoji: '🥜', category: '坚果', calories: 579, protein: 21, fat: 50, carbs: 22, fiber: 12.5, gi: 15, gl: 3, unit: 'g', defaultAmount: 20 },
  { id: 'f094', name: '核桃', emoji: '🥜', category: '坚果', calories: 654, protein: 15, fat: 65, carbs: 14, fiber: 6.7, gi: 15, gl: 2, unit: 'g', defaultAmount: 20 },
  { id: 'f095', name: '腰果', emoji: '🥜', category: '坚果', calories: 553, protein: 18, fat: 44, carbs: 30, fiber: 3.3, gi: 25, gl: 8, unit: 'g', defaultAmount: 20 },
  { id: 'f096', name: '花生', emoji: '🥜', category: '坚果', calories: 567, protein: 25, fat: 45, carbs: 21, fiber: 8.5, gi: 14, gl: 3, unit: 'g', defaultAmount: 30 },
  { id: 'f097', name: '开心果', emoji: '🥜', category: '坚果', calories: 560, protein: 20, fat: 45, carbs: 28, fiber: 10.3, gi: 15, gl: 4, unit: 'g', defaultAmount: 20 },
  { id: 'f098', name: '碧根果', emoji: '🥜', category: '坚果', calories: 691, protein: 9, fat: 72, carbs: 14, fiber: 9.6, gi: 15, gl: 2, unit: 'g', defaultAmount: 20 },
  { id: 'f099', name: '夏威夷果', emoji: '🥜', category: '坚果', calories: 718, protein: 8, fat: 76, carbs: 14, fiber: 8.6, gi: 15, gl: 2, unit: 'g', defaultAmount: 20 },
  { id: 'f100', name: '葵花籽', emoji: '🌻', category: '坚果', calories: 584, protein: 21, fat: 53, carbs: 18, fiber: 8.6, gi: 15, gl: 3, unit: 'g', defaultAmount: 20 },
  { id: 'f101', name: '南瓜子', emoji: '🎃', category: '坚果', calories: 559, protein: 30, fat: 49, carbs: 11, fiber: 4.5, gi: 15, gl: 2, unit: 'g', defaultAmount: 20 },
  { id: 'f102', name: '板栗', emoji: '🌰', category: '坚果', calories: 189, protein: 2, fat: 1, carbs: 45, fiber: 5.1, gi: 60, gl: 22, unit: 'g', defaultAmount: 50 },

  // ========== 饮品 ==========
  { id: 'f103', name: '白开水', emoji: '💧', category: '饮品', calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'ml', defaultAmount: 300 },
  { id: 'f104', name: '矿泉水', emoji: '💧', category: '饮品', calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'ml', defaultAmount: 500 },
  { id: 'f105', name: '柠檬水', emoji: '🍋', category: '饮品', calories: 15, protein: 0, fat: 0, carbs: 4, fiber: 0.1, gi: 50, gl: 2, unit: 'ml', defaultAmount: 300 },
  { id: 'f106', name: '蜂蜜水', emoji: '🍯', category: '饮品', calories: 50, protein: 0, fat: 0, carbs: 13, fiber: 0, gi: 58, gl: 8, unit: 'ml', defaultAmount: 250 },
  { id: 'f107', name: '红茶', emoji: '🍵', category: '饮品', calories: 1, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'ml', defaultAmount: 250 },
  { id: 'f108', name: '绿茶', emoji: '🍵', category: '饮品', calories: 1, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'ml', defaultAmount: 250 },
  { id: 'f109', name: '美式咖啡', emoji: '☕', category: '饮品', calories: 5, protein: 0.3, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'ml', defaultAmount: 250 },
  { id: 'f110', name: '拿铁咖啡', emoji: '☕', category: '饮品', calories: 67, protein: 3.4, fat: 3.6, carbs: 5, fiber: 0, gi: 27, gl: 1, unit: 'ml', defaultAmount: 300 },
  { id: 'f111', name: '卡布奇诺', emoji: '☕', category: '饮品', calories: 74, protein: 4, fat: 4, carbs: 6, fiber: 0, gi: 27, gl: 2, unit: 'ml', defaultAmount: 250 },
  { id: 'f112', name: '奶茶', emoji: '🧋', category: '饮品', calories: 90, protein: 2, fat: 3, carbs: 14, fiber: 0, gi: 31, gl: 4, unit: 'ml', defaultAmount: 300 },
  { id: 'f113', name: '珍珠奶茶', emoji: '🧋', category: '饮品', calories: 190, protein: 2, fat: 3, carbs: 38, fiber: 0.5, gi: 60, gl: 23, unit: 'ml', defaultAmount: 500 },
  { id: 'f114', name: '椰子水', emoji: '🥥', category: '饮品', calories: 19, protein: 1, fat: 0, carbs: 4, fiber: 1.1, gi: 50, gl: 2, unit: 'ml', defaultAmount: 300 },
  { id: 'f115', name: '鲜榨橙汁', emoji: '🍊', category: '饮品', calories: 45, protein: 1, fat: 0, carbs: 10, fiber: 0.2, gi: 50, gl: 5, unit: 'ml', defaultAmount: 250 },
  { id: 'f116', name: '可乐', emoji: '🥤', category: '饮品', calories: 42, protein: 0, fat: 0, carbs: 11, fiber: 0, gi: 63, gl: 7, unit: 'ml', defaultAmount: 330 },
  { id: 'f117', name: '零度可乐', emoji: '🥤', category: '饮品', calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'ml', defaultAmount: 330 },
  { id: 'f118', name: '运动饮料', emoji: '🥤', category: '饮品', calories: 26, protein: 0, fat: 0, carbs: 7, fiber: 0, gi: 78, gl: 5, unit: 'ml', defaultAmount: 500 },

  // ========== 快餐 ==========
  { id: 'f119', name: '薯条', emoji: '🍟', category: '快餐', calories: 312, protein: 3, fat: 17, carbs: 41, fiber: 3.8, gi: 75, gl: 31, unit: 'g', defaultAmount: 100 },
  { id: 'f120', name: '炸鸡', emoji: '🍗', category: '快餐', calories: 246, protein: 19, fat: 15, carbs: 11, fiber: 0.8, gi: 45, gl: 5, unit: 'g', defaultAmount: 150 },
  { id: 'f121', name: '汉堡', emoji: '🍔', category: '快餐', calories: 295, protein: 15, fat: 14, carbs: 30, fiber: 1.8, gi: 65, gl: 20, unit: 'g', defaultAmount: 180 },
  { id: 'f122', name: '披萨', emoji: '🍕', category: '快餐', calories: 266, protein: 11, fat: 10, carbs: 33, fiber: 2.3, gi: 60, gl: 20, unit: 'g', defaultAmount: 200 },
  { id: 'f123', name: '寿司', emoji: '🍣', category: '快餐', calories: 140, protein: 5, fat: 3, carbs: 24, fiber: 1.0, gi: 55, gl: 13, unit: 'g', defaultAmount: 150 },
  { id: 'f124', name: '三明治', emoji: '🥪', category: '快餐', calories: 250, protein: 10, fat: 10, carbs: 32, fiber: 1.8, gi: 62, gl: 20, unit: 'g', defaultAmount: 150 },
  { id: 'f125', name: '蛋炒饭', emoji: '🍳', category: '快餐', calories: 163, protein: 5, fat: 5, carbs: 25, fiber: 0.8, gi: 65, gl: 16, unit: 'g', defaultAmount: 300 },
  { id: 'f126', name: '炒面', emoji: '🍜', category: '快餐', calories: 180, protein: 5, fat: 8, carbs: 24, fiber: 1.5, gi: 55, gl: 13, unit: 'g', defaultAmount: 300 },
  { id: 'f127', name: '煎饺', emoji: '🥟', category: '快餐', calories: 200, protein: 8, fat: 10, carbs: 22, fiber: 1.0, gi: 60, gl: 13, unit: 'g', defaultAmount: 150 },
  { id: 'f128', name: '煎饼果子', emoji: '🥞', category: '快餐', calories: 200, protein: 6, fat: 8, carbs: 28, fiber: 1.5, gi: 60, gl: 17, unit: 'g', defaultAmount: 150 },
  { id: 'f129', name: '麻辣烫', emoji: '🍲', category: '快餐', calories: 150, protein: 8, fat: 8, carbs: 15, fiber: 2.0, gi: 40, gl: 6, unit: 'g', defaultAmount: 300 },
  { id: 'f130', name: '黄焖鸡米饭', emoji: '🍗', category: '快餐', calories: 220, protein: 16, fat: 8, carbs: 25, fiber: 1.5, gi: 60, gl: 15, unit: 'g', defaultAmount: 400 },

  // ========== 甜点 ==========
  { id: 'f131', name: '蛋糕', emoji: '🍰', category: '甜点', calories: 350, protein: 5, fat: 18, carbs: 42, fiber: 0.9, gi: 65, gl: 27, unit: 'g', defaultAmount: 100 },
  { id: 'f132', name: '芝士蛋糕', emoji: '🍰', category: '甜点', calories: 320, protein: 6, fat: 20, carbs: 30, fiber: 0.5, gi: 60, gl: 18, unit: 'g', defaultAmount: 100 },
  { id: 'f133', name: '提拉米苏', emoji: '🍰', category: '甜点', calories: 290, protein: 6, fat: 15, carbs: 33, fiber: 0.5, gi: 55, gl: 18, unit: 'g', defaultAmount: 100 },
  { id: 'f134', name: '布丁', emoji: '🍮', category: '甜点', calories: 120, protein: 3, fat: 4, carbs: 18, fiber: 0, gi: 40, gl: 7, unit: 'g', defaultAmount: 80 },
  { id: 'f135', name: '冰淇淋', emoji: '🍦', category: '甜点', calories: 207, protein: 4, fat: 11, carbs: 24, fiber: 0.5, gi: 51, gl: 12, unit: 'g', defaultAmount: 70 },
  { id: 'f136', name: '蛋黄酥', emoji: '🥮', category: '甜点', calories: 380, protein: 6, fat: 20, carbs: 45, fiber: 1.2, gi: 55, gl: 25, unit: 'g', defaultAmount: 50 },
  { id: 'f137', name: '月饼', emoji: '🥮', category: '甜点', calories: 400, protein: 6, fat: 18, carbs: 52, fiber: 1.5, gi: 60, gl: 31, unit: 'g', defaultAmount: 100 },
  { id: 'f138', name: '麻薯', emoji: '🍡', category: '甜点', calories: 180, protein: 2, fat: 2, carbs: 38, fiber: 0.5, gi: 65, gl: 25, unit: 'g', defaultAmount: 60 },
  { id: 'f139', name: '马卡龙', emoji: '🧁', category: '甜点', calories: 180, protein: 2, fat: 7, carbs: 28, fiber: 0.3, gi: 70, gl: 20, unit: 'g', defaultAmount: 40 },
  { id: 'f140', name: '曲奇饼干', emoji: '🍪', category: '甜点', calories: 488, protein: 6, fat: 24, carbs: 63, fiber: 1.8, gi: 70, gl: 44, unit: 'g', defaultAmount: 45 },
  { id: 'f141', name: '薯片', emoji: '🥔', category: '甜点', calories: 547, protein: 6, fat: 37, carbs: 47, fiber: 4.4, gi: 80, gl: 38, unit: 'g', defaultAmount: 50 },
  { id: 'f142', name: '巧克力', emoji: '🍫', category: '甜点', calories: 546, protein: 5, fat: 31, carbs: 60, fiber: 3.1, gi: 50, gl: 30, unit: 'g', defaultAmount: 30 },

  // ========== 调味 ==========
  { id: 'f143', name: '酱油', emoji: '🫗', category: '调味', calories: 63, protein: 8, fat: 0, carbs: 8, fiber: 0.5, gi: 15, gl: 1, unit: 'ml', defaultAmount: 10 },
  { id: 'f144', name: '醋', emoji: '🫗', category: '调味', calories: 21, protein: 0, fat: 0, carbs: 5, fiber: 0, gi: 15, gl: 1, unit: 'ml', defaultAmount: 15 },
  { id: 'f145', name: '芝麻油', emoji: '🫗', category: '调味', calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'ml', defaultAmount: 5 },
  { id: 'f146', name: '橄榄油', emoji: '🫗', category: '调味', calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'ml', defaultAmount: 10 },
  { id: 'f147', name: '盐', emoji: '🧂', category: '调味', calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 2 },
  { id: 'f148', name: '白糖', emoji: '🍬', category: '调味', calories: 400, protein: 0, fat: 0, carbs: 100, fiber: 0, gi: 65, gl: 65, unit: 'g', defaultAmount: 10 },
  { id: 'f149', name: '蜂蜜', emoji: '🍯', category: '调味', calories: 321, protein: 0, fat: 0, carbs: 82, fiber: 0.2, gi: 58, gl: 48, unit: 'g', defaultAmount: 15 },
  { id: 'f150', name: '沙拉酱', emoji: '🥗', category: '调味', calories: 443, protein: 1, fat: 45, carbs: 8, fiber: 0.5, gi: 55, gl: 4, unit: 'g', defaultAmount: 15 },
  { id: 'f151', name: '蛋黄酱', emoji: '🥚', category: '调味', calories: 680, protein: 1, fat: 75, carbs: 1, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 10 },

  // ========== 早餐 ==========
  { id: 'f152', name: '油条', emoji: '🥖', category: '早餐', calories: 386, protein: 7, fat: 17, carbs: 51, fiber: 0.8, gi: 75, gl: 38, unit: 'g', defaultAmount: 60 },
  { id: 'f153', name: '豆腐脑', emoji: '🧈', category: '早餐', calories: 50, protein: 4, fat: 2, carbs: 3, fiber: 0.2, gi: 15, gl: 1, unit: 'g', defaultAmount: 200 },
  { id: 'f154', name: '小笼包', emoji: '🥟', category: '早餐', calories: 250, protein: 10, fat: 10, carbs: 32, fiber: 1.2, gi: 65, gl: 21, unit: 'g', defaultAmount: 150 },
  { id: 'f155', name: '肠粉', emoji: '🥞', category: '早餐', calories: 120, protein: 4, fat: 3, carbs: 20, fiber: 0.8, gi: 55, gl: 11, unit: 'g', defaultAmount: 200 },
  { id: 'f156', name: '肉包子', emoji: '🥟', category: '早餐', calories: 230, protein: 8, fat: 8, carbs: 32, fiber: 1.3, gi: 68, gl: 22, unit: 'g', defaultAmount: 160 },
  { id: 'f157', name: '鸡蛋饼', emoji: '🥞', category: '早餐', calories: 220, protein: 8, fat: 10, carbs: 26, fiber: 1.2, gi: 60, gl: 16, unit: 'g', defaultAmount: 120 },
  { id: 'f158', name: '手抓饼', emoji: '🥞', category: '早餐', calories: 280, protein: 6, fat: 14, carbs: 34, fiber: 1.0, gi: 70, gl: 24, unit: 'g', defaultAmount: 120 },

  // ========== 火锅 ==========
  { id: 'f159', name: '肥牛', emoji: '🥩', category: '火锅', calories: 200, protein: 24, fat: 11, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f160', name: '肥羊', emoji: '🥩', category: '火锅', calories: 190, protein: 22, fat: 11, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 150 },
  { id: 'f161', name: '毛肚', emoji: '🐄', category: '火锅', calories: 100, protein: 17, fat: 3, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f162', name: '鸭血', emoji: '🩸', category: '火锅', calories: 55, protein: 12, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f163', name: '虾滑', emoji: '🦐', category: '火锅', calories: 110, protein: 18, fat: 3, carbs: 3, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f164', name: '鱼丸', emoji: '🐟', category: '火锅', calories: 100, protein: 15, fat: 2, carbs: 6, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f165', name: '牛肉丸', emoji: '🥩', category: '火锅', calories: 140, protein: 18, fat: 6, carbs: 4, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },

  // ========== 烧烤 ==========
  { id: 'f166', name: '羊肉串', emoji: '🍢', category: '烧烤', calories: 206, protein: 18, fat: 14, carbs: 2, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f167', name: '牛肉串', emoji: '🍢', category: '烧烤', calories: 210, protein: 20, fat: 13, carbs: 2, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f168', name: '烤鱼', emoji: '🐟', category: '烧烤', calories: 150, protein: 25, fat: 5, carbs: 2, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 300 },
  { id: 'f169', name: '烤茄子', emoji: '🍆', category: '烧烤', calories: 80, protein: 3, fat: 4, carbs: 10, fiber: 2.0, gi: 15, gl: 1, unit: 'g', defaultAmount: 150 },
  { id: 'f170', name: '烤玉米', emoji: '🌽', category: '烧烤', calories: 130, protein: 4, fat: 3, carbs: 25, fiber: 3.0, gi: 48, gl: 12, unit: 'g', defaultAmount: 150 },

  // ========== 日料 ==========
  { id: 'f171', name: '刺身', emoji: '🍣', category: '日料', calories: 150, protein: 25, fat: 5, carbs: 2, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 100 },
  { id: 'f172', name: '寿司', emoji: '🍣', category: '日料', calories: 180, protein: 10, fat: 6, carbs: 24, fiber: 1.2, gi: 55, gl: 13, unit: 'g', defaultAmount: 120 },
  { id: 'f173', name: '味噌汤', emoji: '🍲', category: '日料', calories: 35, protein: 3, fat: 1, carbs: 4, fiber: 0.5, gi: 15, gl: 1, unit: 'ml', defaultAmount: 200 },
  { id: 'f174', name: '天妇罗', emoji: '🍤', category: '日料', calories: 260, protein: 8, fat: 14, carbs: 28, fiber: 1.5, gi: 65, gl: 18, unit: 'g', defaultAmount: 100 },

  // ========== 沙拉 ==========
  { id: 'f175', name: '蔬菜沙拉', emoji: '🥗', category: '沙拉', calories: 35, protein: 1.5, fat: 0.3, carbs: 7, fiber: 2.0, gi: 15, gl: 1, unit: 'g', defaultAmount: 200 },
  { id: 'f176', name: '凯撒沙拉', emoji: '🥗', category: '沙拉', calories: 170, protein: 6, fat: 13, carbs: 9, fiber: 1.8, gi: 30, gl: 3, unit: 'g', defaultAmount: 200 },
  { id: 'f177', name: '鸡胸肉沙拉', emoji: '🥗', category: '沙拉', calories: 120, protein: 18, fat: 4, carbs: 5, fiber: 2.5, gi: 15, gl: 1, unit: 'g', defaultAmount: 250 },
  { id: 'f178', name: '金枪鱼沙拉', emoji: '🥗', category: '沙拉', calories: 140, protein: 16, fat: 6, carbs: 6, fiber: 2.0, gi: 20, gl: 1, unit: 'g', defaultAmount: 200 },

  // ========== 主食 ==========
  { id: 'f179', name: '玉米', emoji: '🌽', category: '主食', calories: 112, protein: 4, fat: 1.2, carbs: 23, fiber: 2.9, gi: 52, gl: 12, unit: 'g', defaultAmount: 200 },
  { id: 'f180', name: '小米粥', emoji: '🍚', category: '主食', calories: 46, protein: 1.4, fat: 0.7, carbs: 9, fiber: 0.8, gi: 60, gl: 5, unit: 'g', defaultAmount: 200 },
  { id: 'f181', name: '八宝粥', emoji: '🍚', category: '主食', calories: 78, protein: 2.0, fat: 0.5, carbs: 17, fiber: 1.5, gi: 50, gl: 9, unit: 'g', defaultAmount: 250 },
  { id: 'f182', name: '红豆粥', emoji: '🍚', category: '主食', calories: 85, protein: 3.0, fat: 0.5, carbs: 18, fiber: 2.5, gi: 45, gl: 8, unit: 'g', defaultAmount: 200 },
  { id: 'f183', name: '意面', emoji: '🍝', category: '主食', calories: 131, protein: 5, fat: 1.1, carbs: 25, fiber: 1.8, gi: 49, gl: 24, unit: 'g', defaultAmount: 180 },
  { id: 'f184', name: '披萨饼底', emoji: '🍕', category: '主食', calories: 275, protein: 9, fat: 3, carbs: 54, fiber: 2.1, gi: 70, gl: 38, unit: 'g', defaultAmount: 100 },

  // ========== 汤类 ==========
  { id: 'f185', name: '番茄蛋汤', emoji: '🍲', category: '汤类', calories: 45, protein: 3, fat: 2, carbs: 4, fiber: 0.8, gi: 15, gl: 1, unit: 'ml', defaultAmount: 250 },
  { id: 'f186', name: '紫菜蛋汤', emoji: '🍲', category: '汤类', calories: 40, protein: 4, fat: 2, carbs: 2, fiber: 0.5, gi: 15, gl: 1, unit: 'ml', defaultAmount: 250 },
  { id: 'f187', name: '玉米排骨汤', emoji: '🍲', category: '汤类', calories: 85, protein: 8, fat: 4, carbs: 5, fiber: 0.8, gi: 30, gl: 2, unit: 'ml', defaultAmount: 300 },
  { id: 'f188', name: '鸡汤', emoji: '🍗', category: '汤类', calories: 70, protein: 8, fat: 3, carbs: 3, fiber: 0.2, gi: 15, gl: 1, unit: 'ml', defaultAmount: 300 },
  { id: 'f189', name: '鱼汤', emoji: '🐟', category: '汤类', calories: 50, protein: 8, fat: 1, carbs: 2, fiber: 0.2, gi: 15, gl: 1, unit: 'ml', defaultAmount: 300 },
  { id: 'f190', name: '酸辣汤', emoji: '🍲', category: '汤类', calories: 65, protein: 3, fat: 3, carbs: 6, fiber: 0.5, gi: 25, gl: 2, unit: 'ml', defaultAmount: 250 },

  // ========== 运动补剂 ==========
  { id: 'f191', name: '蛋白粉', emoji: '💪', category: '补剂', calories: 120, protein: 24, fat: 1, carbs: 3, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 30 },
  { id: 'f192', name: '乳清蛋白', emoji: '💪', category: '补剂', calories: 115, protein: 25, fat: 1, carbs: 2, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 30 },
  { id: 'f193', name: '增肌粉', emoji: '💪', category: '补剂', calories: 250, protein: 25, fat: 3, carbs: 35, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 75 },
  { id: 'f194', name: '能量棒', emoji: '🍫', category: '补剂', calories: 220, protein: 10, fat: 8, carbs: 30, fiber: 3.0, gi: 55, gl: 17, unit: 'g', defaultAmount: 60 },
  { id: 'f195', name: 'BCAA', emoji: '💪', category: '补剂', calories: 10, protein: 2, fat: 0, carbs: 0, fiber: 0, gi: 0, gl: 0, unit: 'g', defaultAmount: 10 },
]

// 营养筛选标签
export type NutritionTag = 'highProtein' | 'highCarb' | 'highFat' | 'lowGI' | 'lowGL' | 'highFiber'

export const nutritionTags: { key: NutritionTag; label: string; color: string; condition: (food: FoodItem) => boolean }[] = [
  { 
    key: 'highProtein', 
    label: '高蛋白', 
    color: 'bg-red-500/20 text-red-400',
    condition: (food) => food.protein >= 15 
  },
  { 
    key: 'highCarb', 
    label: '高碳水', 
    color: 'bg-amber-500/20 text-amber-400',
    condition: (food) => food.carbs >= 25 
  },
  { 
    key: 'highFat', 
    label: '高脂肪', 
    color: 'bg-orange-500/20 text-orange-400',
    condition: (food) => food.fat >= 15 
  },
  { 
    key: 'lowGI', 
    label: '低GI', 
    color: 'bg-green-500/20 text-green-400',
    condition: (food) => food.gi > 0 && food.gi <= 55 
  },
  { 
    key: 'lowGL', 
    label: '低GL', 
    color: 'bg-teal-500/20 text-teal-400',
    condition: (food) => food.gl > 0 && food.gl <= 10 
  },
  { 
    key: 'highFiber', 
    label: '高纤维', 
    color: 'bg-emerald-500/20 text-emerald-400',
    condition: (food) => food.fiber >= 3 
  },
]

// 获取食物的营养标签
export function getFoodTags(food: FoodItem): NutritionTag[] {
  return nutritionTags
    .filter(tag => tag.condition(food))
    .map(tag => tag.key)
}

// 获取营养标签文字描述
export function getFoodTagLabels(food: FoodItem): string[] {
  return nutritionTags
    .filter(tag => tag.condition(food))
    .map(tag => tag.label)
}

export const foodCategories = [
  '水果', '蔬菜', '肉类', '海鲜', '蛋类', '奶类', 
  '谷物', '面包', '豆类', '坚果', '饮品', '快餐', 
  '甜点', '调味', '早餐', '火锅', '烧烤', '日料', 
  '沙拉', '主食', '汤类', '补剂'
]
