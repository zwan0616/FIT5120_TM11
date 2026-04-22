"""
Pydantic schemas for daily healthy challenge endpoints.
"""

from pydantic import BaseModel, Field


class DailyChallengeTask(BaseModel):
    id: int = Field(..., description="Unique task identifier")
    task_name: str = Field(..., description="Display title of the challenge")
    tips: str = Field(..., description="Short user-facing tip")
    image_url: str | None = Field(None, description="URL or path to challenge image")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "task_name": "Strong Bone Milk",
                "tips": "Drink your milk today!",
                "image_url": "/assets/images/strong_Bone_Milk.png",
            }
        }


class DailyChallengeCompleteRequest(BaseModel):
    id: int = Field(..., description="Task identifier to complete")


class DailyChallengeCompleteResponse(BaseModel):
    id: int = Field(..., description="Unique task identifier")
    task_name: str = Field(..., description="Display title of the challenge")
    feedback: str = Field(..., description="Completion feedback shown to the user")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "task_name": "Strong Bone Milk",
                "feedback": "Your bones are getting hard as rocks!",
            }
        }
