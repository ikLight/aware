import os
import json
import ollama

from src.student_proficiency import StudentProficiency

##------------------- START OF testGenerator -------------------##

class testGenerator:

    def __init__(self, json_path, course_material_json):
        self._proficiency = StudentProficiency(json_path).set_proficiency()
        self._model = "deepseek-r1:1.5b"
        with open(course_material_json) as f:
            self._course_material = json.load(f)
    
    ##------------------------------------------------##

    def _get_prompt(self, topic, content):
        prompt = f"""
        Based on the given course material - 
        Topic: {topic}
        Content: {content}
        Generate 1 question that challenges a student with the proficiency - {self._proficiency}.
        Generate the answer too.
        Return your response is the format of a dictionary with the keys question and answer.
        Do not add any header or footer, only return the final json with the specified keys.
        """
        return prompt
    
    ##------------------------------------------------##

    def _infer(self, prompt):
        response = ollama.generate(model=self._model, prompt=prompt)["response"]
        return response
    
    ##------------------------------------------------##

    def create_test(self):
        qa_list = []
        topics = self._course_material["topics"]
        for topic in topics:
            prompt = self._get_prompt(topic, self._course_material[topic])
            qa = self._infer(prompt)
            qa_list.append(qa)
        return qa_list

##------------------- END OF testGenerator -------------------##



    
         