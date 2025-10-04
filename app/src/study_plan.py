import os
import json
import ollama

from src.student_proficiency import StudentProficiency

##------------------- START OF studyPlan -------------------##

class studyPlan:

    def __init__(self, json_path, course_material_json):
        self._proficiency = StudentProficiency(json_path).set_proficiency()
        self._model = "llama3.1:8b"
        with open(course_material_json) as f:
            self._course_material = json.load(f)
    
    ##------------------------------------------------##

    def _get_topicwise_plan_prompt(self, topic, content):
        prompt = f"""
        Based on the given course material - 
        Topic: {topic}
        Content: {content}
        Generate a study plan for a student with the proficiency - {self._proficiency}.
        Return your response in the format of a string.
        Do not add any header or footer, only return the final study plan.
        """
        return prompt
    
    ##------------------------------------------------##

    def _get_final_plan_prompt(self, plan_list):
        prompt = f"""
        Based on the list of study plans, filter out the least useful content for a student with the proficiency - {self._proficiency}.
        List of study plans - {plan_list}
        Return your response in the format of a list of study plans. 
        Do not add any headers or footers, only return the final list.
        """
        return prompt
    ##------------------------------------------------##

    def _infer(self, prompt):
        response = ollama.generate(model=self._model, prompt=prompt)["response"]
        return response
    
    ##------------------------------------------------##

    def create_study_plan(self):
        plan_list = []
        topics = self._course_material["topics"]
        print(1)
        for topic in topics:
            topic_prompt = self._get_topicwise_plan_prompt(topic, self._course_material[topic])
            plan = self._infer(topic_prompt)
            plan_list.append(plan)
        print(2)
        filter_prompt = self._get_final_plan_prompt(plan_list)
        print(3)
        study_plan = self._infer(filter_prompt)
        print(4)
        return study_plan
        

##------------------- END OF testGenerator -------------------##



    
         