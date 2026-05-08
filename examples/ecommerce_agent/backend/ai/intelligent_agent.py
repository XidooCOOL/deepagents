import json
import re
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class IntentType(Enum):
    PUBLISH_PRODUCT = "publish_product"
    MANAGE_REVIEWS = "manage_reviews"
    COLLECT_DATA = "collect_data"
    ORDER_MANAGEMENT = "order_management"
    PRICE_ADJUSTMENT = "price_adjustment"
    STOCK_UPDATE = "stock_update"
    STORE_CONFIG = "store_config"
    REPORT_GENERATION = "report_generation"
    GENERAL_QUERY = "general_query"
    UNKNOWN = "unknown"


class Platform(Enum):
    DOUYIN = "douyin"
    PINDUODUO = "pinduoduo"
    TAOBAO = "taobao"
    JD = "jingdong"
    XIAOHONGSHU = "xiaohongshu"
    ALL = "all"


class Priority(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class Intent:
    type: IntentType
    confidence: float
    platforms: List[Platform] = field(default_factory=list)
    entities: Dict[str, Any] = field(default_factory=dict)
    parameters: Dict[str, Any] = field(default_factory=dict)
    original_text: str = ""
    suggestions: List[str] = field(default_factory=list)


@dataclass
class TaskStep:
    id: str
    name: str
    action: str
    description: str
    required_params: List[str] = field(default_factory=list)
    optional_params: Dict[str, Any] = field(default_factory=dict)
    estimated_duration: int = 30
    retry_on_fail: bool = True
    fallback_action: Optional[str] = None
    skills_required: List[str] = field(default_factory=list)


@dataclass
class ExecutionPlan:
    task_id: str
    intent: Intent
    steps: List[TaskStep]
    estimated_duration: int
    priority: Priority
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)


class AIIntentRecognizer:
    def __init__(self):
        self.intent_patterns = {
            IntentType.PUBLISH_PRODUCT: [
                r"发布[商]?[品]?[发布]?",
                r"上架[商]?[品]?",
                r"添加[商]?[品]?",
                r"新建[商]?[品]?",
                r"商品发布",
                r"上传商品",
                r"发布到.*",
                r"把.*发布到",
            ],
            IntentType.MANAGE_REVIEWS: [
                r"[好]?评.*管理",
                r"回复[评]?[价]?",
                r"[评]?[价]?管理",
                r"好评.*回复",
                r"追评",
                r"评价[管理]?",
            ],
            IntentType.COLLECT_DATA: [
                r"[采]?[集]?[数]?[据]?",
                r"数据[分析]?",
                r"报表",
                r"销售[数据]?",
                r"订单[数据]?",
                r"统计",
                r"[查]?看.*数据",
            ],
            IntentType.ORDER_MANAGEMENT: [
                r"订单.*",
                r"[查]?看.*订单",
                r"订单[状态]?",
                r"发货",
                r"退款",
                r"[处理]?订单",
            ],
            IntentType.PRICE_ADJUSTMENT: [
                r"[调]?[整]?价格",
                r"降价",
                r"涨价",
                r"[修改]?价格",
                r"优惠.*设置",
                r"折扣",
            ],
            IntentType.STOCK_UPDATE: [
                r"[更新]?库存",
                r"[修改]?库存",
                r"[查]?看.*库存",
                r"[补]?货",
                r"[调整]?.*数量",
            ],
            IntentType.STORE_CONFIG: [
                r"店铺.*配置",
                r"[设置]?店铺",
                r"登录.*店铺",
                r"[配置]?.*店铺",
            ],
            IntentType.REPORT_GENERATION: [
                r"生成.*报告",
                r"[导出]?报表",
                r"[生成]?.*统计",
            ],
        }
        
        self.platform_keywords = {
            Platform.DOUYIN: ["抖音", "douyin", "抖音电商", "抖音小店"],
            Platform.PINDUODUO: ["拼多多", "pinduoduo", "pdd", "多多"],
            Platform.TAOBAO: ["淘宝", "taobao", "天猫", "tmall"],
            Platform.JD: ["京东", "jingdong", "jd", "京喜"],
            Platform.XIAOHONGSHU: ["小红书", "xhs", "red", "RED"],
        }
        
        self.entity_extractors = {
            "product_id": r"商品[ID]?[:：]?\s*([A-Za-z0-9\-]+)",
            "order_id": r"订单[号]?[:：]?\s*([A-Za-z0-9\-]+)",
            "price": r"([¥￥]?\s*\d+\.?\d*)",
            "quantity": r"(\d+)\s*[个件箱袋]?",
            "date_range": r"(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*[至~-]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})",
        }

    def recognize(self, text: str) -> Intent:
        text_lower = text.lower()
        text_normalized = self._normalize_text(text)
        
        best_intent = IntentType.UNKNOWN
        best_confidence = 0.0
        
        for intent_type, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_normalized):
                    confidence = self._calculate_confidence(pattern, text_normalized)
                    if confidence > best_confidence:
                        best_confidence = confidence
                        best_intent = intent_type
        
        platforms = self._extract_platforms(text)
        entities = self._extract_entities(text)
        suggestions = self._generate_suggestions(best_intent, text)
        
        return Intent(
            type=best_intent,
            confidence=best_confidence,
            platforms=platforms,
            entities=entities,
            original_text=text,
            suggestions=suggestions
        )

    def _normalize_text(self, text: str) -> str:
        text = text.lower()
        replacements = {
            " ": "",
            "　": "",
            "商品": "商品",
            "产品": "商品",
            "宝贝": "商品",
            "链接": "链接",
        }
        for old, new in replacements.items():
            text = text.replace(old, new)
        return text

    def _calculate_confidence(self, pattern: str, text: str) -> float:
        base_score = 0.5
        
        pattern_length = len(pattern.replace(r"\d+", "1").replace(r"[", "").replace("]", ""))
        text_length = len(text)
        
        if text_length < 50:
            base_score += 0.2
        elif text_length < 200:
            base_score += 0.1
        
        if re.search(pattern, text):
            base_score += 0.3
        
        return min(base_score, 0.99)

    def _extract_platforms(self, text: str) -> List[Platform]:
        platforms = []
        for platform, keywords in self.platform_keywords.items():
            for keyword in keywords:
                if keyword.lower() in text.lower():
                    platforms.append(platform)
                    break
        return platforms if platforms else [Platform.ALL]

    def _extract_entities(self, text: str) -> Dict[str, Any]:
        entities = {}
        
        for entity_name, pattern in self.entity_extractors.items():
            match = re.search(pattern, text)
            if match:
                entities[entity_name] = match.group(1) if match.groups() else match.group(0)
        
        return entities

    def _generate_suggestions(self, intent: IntentType, text: str) -> List[str]:
        suggestions = []
        
        if intent == IntentType.PUBLISH_PRODUCT:
            suggestions = [
                "请提供商品标题和描述",
                "请上传商品图片",
                "请设置商品价格和库存"
            ]
        elif intent == IntentType.MANAGE_REVIEWS:
            suggestions = [
                "是否需要使用自动回复模板？",
                "需要回复好评还是差评？"
            ]
        elif intent == IntentType.COLLECT_DATA:
            suggestions = [
                "请选择数据维度（销量/订单/访客）",
                "请设置查询日期范围"
            ]
        elif intent == IntentType.UNKNOWN:
            suggestions = [
                "请尝试更详细的描述",
                "例如：发布商品到抖音店铺"
            ]
        
        return suggestions


class IntelligentTaskDecomposer:
    def __init__(self):
        self.task_templates = self._load_task_templates()
        self.step_library = self._load_step_library()

    def _load_task_templates(self) -> Dict[str, List[str]]:
        return {
            "publish_product": [
                "prepare_environment",
                "navigate_to_publish",
                "fill_product_info",
                "upload_images",
                "set_price_stock",
                "submit_for_review"
            ],
            "manage_reviews": [
                "navigate_to_reviews",
                "filter_reviews",
                "read_review_content",
                "compose_reply",
                "submit_reply"
            ],
            "collect_data": [
                "navigate_to_data_center",
                "select_data_dimension",
                "set_date_range",
                "export_data"
            ],
            "order_management": [
                "navigate_to_orders",
                "filter_orders",
                "check_order_detail",
                "process_order"
            ],
        }

    def _load_step_library(self) -> Dict[str, TaskStep]:
        return {
            "prepare_environment": TaskStep(
                id="prepare",
                name="准备执行环境",
                action="check_browser",
                description="检查浏览器状态，确保已登录目标平台",
                estimated_duration=10,
                skills_required=["browser"]
            ),
            "navigate_to_publish": TaskStep(
                id="navigate_publish",
                name="导航到发布页面",
                action="navigate",
                description="打开商品发布页面",
                estimated_duration=15,
                retry_on_fail=True,
                fallback_action="retry_navigation"
            ),
            "fill_product_info": TaskStep(
                id="fill_info",
                name="填写商品信息",
                action="input",
                description="填写商品标题、描述、规格等信息",
                estimated_duration=60,
                skills_required=["product-publish"]
            ),
            "upload_images": TaskStep(
                id="upload_img",
                name="上传商品图片",
                action="upload",
                description="上传商品主图和详情图",
                estimated_duration=120,
                retry_on_fail=True,
                fallback_action="retry_upload"
            ),
            "set_price_stock": TaskStep(
                id="set_price",
                name="设置价格和库存",
                action="input",
                description="设置商品价格和库存数量",
                estimated_duration=30,
                skills_required=["product-publish"]
            ),
            "submit_for_review": TaskStep(
                id="submit",
                name="提交审核",
                action="click",
                description="点击提交按钮，等待审核结果",
                estimated_duration=30,
                fallback_action="check_error"
            ),
            "navigate_to_reviews": TaskStep(
                id="nav_reviews",
                name="导航到评价页面",
                action="navigate",
                description="打开评价管理页面",
                estimated_duration=15,
                skills_required=["good-review"]
            ),
            "filter_reviews": TaskStep(
                id="filter",
                name="筛选评价",
                action="select",
                description="根据条件筛选评价列表",
                estimated_duration=10
            ),
            "read_review_content": TaskStep(
                id="read",
                name="读取评价内容",
                action="extract",
                description="提取评价文字和图片内容",
                estimated_duration=20
            ),
            "compose_reply": TaskStep(
                id="compose",
                name="生成回复内容",
                action="ai_generate",
                description="使用AI生成回复内容",
                estimated_duration=15,
                skills_required=["ai-reply"]
            ),
            "submit_reply": TaskStep(
                id="reply",
                name="提交回复",
                action="click",
                description="提交评价回复",
                estimated_duration=10,
                fallback_action="retry_reply"
            ),
        }

    def decompose(self, intent: Intent) -> ExecutionPlan:
        task_id = f"TASK-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        intent_type_str = intent.type.value
        template_steps = self.task_templates.get(intent_type_str, [])
        
        steps = []
        for i, step_key in enumerate(template_steps):
            if step_key in self.step_library:
                step = self.step_library[step_key]
                step_with_context = TaskStep(
                    id=f"{step.id}_{i+1}",
                    name=step.name,
                    action=step.action,
                    description=step.description,
                    required_params=step.required_params.copy(),
                    optional_params=step.optional_params.copy(),
                    estimated_duration=step.estimated_duration,
                    retry_on_fail=step.retry_on_fail,
                    fallback_action=step.fallback_action,
                    skills_required=step.skills_required.copy()
                )
                steps.append(step_with_context)
        
        estimated_duration = sum(s.estimated_duration for s in steps)
        priority = self._determine_priority(intent)
        
        return ExecutionPlan(
            task_id=task_id,
            intent=intent,
            steps=steps,
            estimated_duration=estimated_duration,
            priority=priority,
            metadata={
                "platforms": [p.value for p in intent.platforms],
                "entities": intent.entities,
                "confidence": intent.confidence
            }
        )

    def _determine_priority(self, intent: Intent) -> Priority:
        if intent.confidence < 0.5:
            return Priority.LOW
        
        high_priority_intents = [
            IntentType.PUBLISH_PRODUCT,
            IntentType.ORDER_MANAGEMENT,
            IntentType.PRICE_ADJUSTMENT
        ]
        
        if intent.type in high_priority_intents:
            return Priority.HIGH
        
        return Priority.MEDIUM

    def optimize_plan(self, plan: ExecutionPlan, context: Dict[str, Any]) -> ExecutionPlan:
        if context.get("is_urgent"):
            for step in plan.steps:
                step.estimated_duration = max(1, step.estimated_duration // 2)
        
        if context.get("skip_verification"):
            plan.steps = [s for s in plan.steps if "review" not in s.id.lower()]
        
        return plan


class IntelligentRecommender:
    def __init__(self):
        self.learning_history: List[Dict[str, Any]] = []
        self.platform_performance: Dict[str, Dict[str, Any]] = {}
        self._init_platform_data()

    def _init_platform_data(self):
        self.platform_performance = {
            "douyin": {
                "best_publish_hours": [9, 10, 14, 15, 19, 20, 21],
                "peak_hours": [12, 19, 20, 21],
                "avg_conversion_rate": 0.032,
                "best_categories": ["美妆", "服饰", "食品", "家居"]
            },
            "pinduoduo": {
                "best_publish_hours": [10, 11, 14, 15, 16],
                "peak_hours": [10, 14, 20],
                "avg_conversion_rate": 0.045,
                "best_categories": ["农产品", "小商品", "服饰", "家电"]
            },
            "taobao": {
                "best_publish_hours": [9, 10, 11, 14, 15, 20],
                "peak_hours": [10, 15, 21],
                "avg_conversion_rate": 0.028,
                "best_categories": ["服装", "数码", "美妆", "母婴"]
            }
        }

    def recommend_price(self, product_info: Dict[str, Any], platform: str) -> Dict[str, Any]:
        cost_price = product_info.get("cost_price", 0)
        category = product_info.get("category", "")
        
        if platform in self.platform_performance:
            data = self.platform_performance[platform]
            recommended_margin = 1.5 + (data["avg_conversion_rate"] * 10)
        else:
            recommended_margin = 2.0
        
        recommended_price = cost_price * recommended_margin
        
        return {
            "recommended_price": round(recommended_price, 2),
            "min_price": round(cost_price * 1.2, 2),
            "max_price": round(recommended_price * 1.5, 2),
            "margin": round((recommended_price - cost_price) / cost_price * 100, 1),
            "strategy": "competitive" if recommended_margin < 2 else "premium"
        }

    def recommend_publish_time(self, platform: str) -> Dict[str, Any]:
        if platform not in self.platform_performance:
            platform = "douyin"
        
        data = self.platform_performance[platform]
        best_hours = data["best_publish_hours"]
        peak_hours = data["peak_hours"]
        
        current_hour = datetime.now().hour
        
        if current_hour in peak_hours:
            suggested_hour = current_hour
        else:
            for hour in sorted(best_hours, key=lambda h: abs(h - current_hour)):
                if hour > current_hour:
                    suggested_hour = hour
                    break
            else:
                suggested_hour = best_hours[0]
        
        return {
            "recommended_hour": suggested_hour,
            "best_hours": best_hours,
            "peak_hours": peak_hours,
            "reason": f"{platform}在{peak_hours}时段流量最高"
        }

    def recommend_platform(self, product_info: Dict[str, Any]) -> List[Dict[str, Any]]:
        category = product_info.get("category", "")
        target_price = product_info.get("price", 100)
        
        recommendations = []
        
        for platform, data in self.platform_performance.items():
            score = 0
            
            if category in data["best_categories"]:
                score += 30
            
            if data["avg_conversion_rate"] > 0.03:
                score += 20
            
            if target_price < 50:
                if platform == "pinduoduo":
                    score += 25
            elif target_price < 200:
                if platform in ["douyin", "taobao"]:
                    score += 25
            else:
                if platform == "jd":
                    score += 25
            
            recommendations.append({
                "platform": platform,
                "score": score,
                "conversion_rate": data["avg_conversion_rate"],
                "best_categories": data["best_categories"]
            })
        
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        
        return recommendations

    def learn_from_result(self, task_result: Dict[str, Any]):
        self.learning_history.append({
            "timestamp": datetime.now().isoformat(),
            "task_type": task_result.get("type"),
            "platform": task_result.get("platform"),
            "success": task_result.get("success"),
            "duration": task_result.get("duration"),
            "error": task_result.get("error")
        })
        
        if len(self.learning_history) > 1000:
            self.learning_history = self.learning_history[-1000:]
        
        self._update_platform_data(task_result)

    def _update_platform_data(self, result: Dict[str, Any]):
        platform = result.get("platform")
        if not platform or platform not in self.platform_performance:
            return
        
        success = result.get("success", False)
        data = self.platform_performance[platform]
        
        if success:
            data["avg_conversion_rate"] = data["avg_conversion_rate"] * 0.95 + 0.05
        else:
            data["avg_conversion_rate"] = data["avg_conversion_rate"] * 0.98


class AdaptiveLearningSystem:
    def __init__(self):
        self.failure_patterns: Dict[str, List[Dict]] = {}
        self.selector_optimizations: Dict[str, List[str]] = {}
        self.success_patterns: Dict[str, Any] = {}
        self.learning_threshold = 3

    def record_step_result(self, step_id: str, success: bool, 
                          selector_used: str = None, error: str = None,
                          platform: str = None):
        key = f"{platform}_{step_id}" if platform else step_id
        
        if key not in self.failure_patterns:
            self.failure_patterns[key] = []
            self.selector_optimizations[key] = []
        
        if success:
            if selector_used:
                self.selector_optimizations[key].append(selector_used)
                self.selector_optimizations[key] = self.selector_optimizations[key][-10:]
        else:
            self.failure_patterns[key].append({
                "timestamp": datetime.now().isoformat(),
                "selector": selector_used,
                "error": error
            })
            
            if len(self.failure_patterns[key]) > self.learning_threshold:
                self._analyze_failure_pattern(key)

    def _analyze_failure_pattern(self, key: str):
        failures = self.failure_patterns[key]
        
        error_types = {}
        for failure in failures[-10:]:
            error = failure.get("error", "unknown")
            error_types[error] = error_types.get(error, 0) + 1
        
        most_common_error = max(error_types, key=error_types.get)
        
        self.success_patterns[key] = {
            "common_error": most_common_error,
            "failure_count": len(failures),
            "suggested_action": self._generate_suggestion(most_common_error)
        }

    def _generate_suggestion(self, error: str) -> str:
        suggestions = {
            "element_not_found": "考虑使用备用选择器或调整页面等待时间",
            "timeout": "增加等待时间或检查网络连接",
            "stale_element": "页面可能已更新，刷新后重试",
            "click_failed": "尝试使用JavaScript点击或滚动到元素可见"
        }
        return suggestions.get(error, "请检查元素状态或选择器")

    def get_optimized_selector(self, key: str) -> Optional[str]:
        if key in self.selector_optimizations and self.selector_optimizations[key]:
            return self.selector_optimizations[key][-1]
        return None

    def get_failure_insight(self, key: str) -> Optional[Dict]:
        return self.success_patterns.get(key)

    def suggest_improvements(self, platform: str, task_type: str) -> List[str]:
        suggestions = []
        key = f"{platform}_{task_type}"
        
        if key in self.success_patterns:
            insight = self.success_patterns[key]
            suggestions.append(insight["suggested_action"])
        
        recent_failures = sum(
            1 for k, v in self.failure_patterns.items() 
            if k.startswith(platform) and len(v) > 0
        )
        
        if recent_failures > 5:
            suggestions.append("该平台近期失败率较高，建议检查浏览器状态")
        
        return suggestions


def create_intelligent_agent() -> Dict[str, Any]:
    return {
        "intent_recognizer": AIIntentRecognizer(),
        "task_decomposer": IntelligentTaskDecomposer(),
        "recommender": IntelligentRecommender(),
        "learning_system": AdaptiveLearningSystem()
    }
