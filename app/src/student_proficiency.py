import json
import os

##------------------- START OF StudentProficiency -------------------##
"""
We should treat each student as an individual object. So, for every new student we 
should create a new object of this class. 
Ideally this input will be read directly from the DB, which is populated from the API input from the UI.
Also, in future versions, the proficiency will be a learned parameter. Doing this since the student must
challenged but not overly challenged, i.e., give them just enough to keep it interesting.
"""

class StudentProficiency(): 
    def __init__(self, json_path):
        with open(json_path) as f:
            self._data = json.load(f)

    ##------------------------------------------------##

    def __proficiency_map(self):
        self.__p_map = {0: "beginner", 1: "intermediate", 2: "competent"}

    ##------------------------------------------------##

    def set_proficiency(self):
        self.proficiency = self.__p_map["proficiency"]

##------------------- END OF StudentProficiency -------------------##
