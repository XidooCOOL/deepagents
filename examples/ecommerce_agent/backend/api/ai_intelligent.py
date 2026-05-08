from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

from .intelligent_agent import (
    AIIntentRecognizer,
    IntelligentTaskDecomposer,
    IntelligentRecommender,
    AdaptiveLearningSystem,
    IntentType,
    Platform,
    Intent,
    ExecutionPlan,
    TaskStep,
    create_intelligent_agent
)

router = APIRouter(prefix="/api/ai", tags=["AI智能"])

ai_components = create_intelligent_agent()
intent_recognizer = ai_components["intent_recognizer"]
task_decomposer = ai_components["task_decomposer"]
recommender = ai_components["recommender"]
learning_system = ai_components["learning_system"]


class IntentRecognizeRequest(BaseModel):
    text: str


class IntentRecognizeResponse(BaseModel):
    type: str
    confidence: float
    platforms: List[str]
    entities: Dict[str, Any]
    suggestions: List[str]
    original_text: str


class TaskDecomposeRequest(BaseModel):
    text: str
    context: Optional[Dict[str, Any]] = None


class StepResponse(BaseModel):
    id: str
    name: str
    action: str
    description: str
    estimated_duration: int
    retry_on_fail: bool
    fallback_action: Optional[str]
    skills_required: List[str]


class ExecutionPlanResponse(BaseModel):
    task_id: str
    intent: Dict[str, Any]
    steps: List[StepResponse]
    estimated_duration: int
    priority: str
    metadata: Dict[str, Any]
    created_at: str


class PriceRecommendRequest(BaseModel):
    cost_price: float
    category: str
    platform: str


class PublishTimeRecommendRequest(BaseModel):
    platform: str


class PlatformRecommendRequest(BaseModel):
    category: str
    price: float


class StepResultRequest(BaseModel):
    step_id: str
    success: bool
    selector_used: Optional[str] = None
    error: Optional[str] = None
    platform: Optional[str] = None


class LearningInsightRequest(BaseModel):
    platform: str
    task_type: str


@router.post("/recognize", response_model=IntentRecognizeResponse)
async def recognize_intent(request: IntentRecognizeRequest):
    try:
        intent = intent_recognizer.recognize(request.text)
        
        return IntentRecognizeResponse(
            type=intent.type.value,
            confidence=intent.confidence,
            platforms=[p.value for p in intent.platforms],
            entities=intent.entities,
            suggestions=intent.suggestions,
            original_text=intent.original_text
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/decompose", response_model=ExecutionPlanResponse)
async def decompose_task(request: TaskDecomposeRequest):
    try:
        intent = intent_recognizer.recognize(request.text)
        plan = task_decomposer.decompose(intent)
        
        if request.context:
            plan = task_decomposer.optimize_plan(plan, request.context)
        
        return ExecutionPlanResponse(
            task_id=plan.task_id,
            intent={
                "type": plan.intent.type.value,
                "confidence": plan.intent.confidence,
                "platforms": [p.value for p in plan.intent.platforms],
                "entities": plan.intent.entities
            },
            steps=[
                StepResponse(
                    id=step.id,
                    name=step.name,
                    action=step.action,
                    description=step.description,
                    estimated_duration=step.estimated_duration,
                    retry_on_fail=step.retry_on_fail,
                    fallback_action=step.fallback_action,
                    skills_required=step.skills_required
                )
                for step in plan.steps
            ],
            estimated_duration=plan.estimated_duration,
            priority=plan.priority.value,
            metadata=plan.metadata,
            created_at=plan.created_at.isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend/price")
async def recommend_price(request: PriceRecommendRequest):
    try:
        result = recommender.recommend_price(
            {"cost_price": request.cost_price, "category": request.category},
            request.platform
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend/publish-time")
async def recommend_publish_time(request: PublishTimeRecommendRequest):
    try:
        result = recommender.recommend_publish_time(request.platform)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommend/platform")
async def recommend_platform(request: PlatformRecommendRequest):
    try:
        result = recommender.recommend_platform(
            {"category": request.category, "price": request.price}
        )
        return {"recommendations": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learning/record")
async def record_step_result(request: StepResultRequest):
    try:
        learning_system.record_step_result(
            step_id=request.step_id,
            success=request.success,
            selector_used=request.selector_used,
            error=request.error,
            platform=request.platform
        )
        
        if not request.success and request.platform:
            improvements = learning_system.suggest_improvements(
                request.platform,
                request.step_id.split("_")[0]
            )
            return {"recorded": True, "suggestions": improvements}
        
        return {"recorded": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learning/insights/{platform}/{task_type}")
async def get_learning_insights(platform: str, task_type: str):
    try:
        key = f"{platform}_{task_type}"
        insight = learning_system.get_failure_insight(key)
        optimized_selector = learning_system.get_optimized_selector(key)
        suggestions = learning_system.suggest_improvements(platform, task_type)
        
        return {
            "insight": insight,
            "optimized_selector": optimized_selector,
            "suggestions": suggestions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/learning/patterns")
async def get_learning_patterns():
    try:
        return {
            "failure_patterns": {
                k: len(v) for k, v in learning_system.failure_patterns.items()
            },
            "total_learning_items": len(learning_system.learning_threshold),
            "optimized_selectors": {
                k: v[-1] if v else None
                for k, v in learning_system.selector_optimizations.items()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learning/from-result")
async def learn_from_result(result: Dict[str, Any]):
    try:
        recommender.learn_from_result(result)
        return {"learned": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
