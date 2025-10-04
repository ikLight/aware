from src.test_generator import testGenerator

pro_json = "data/student_input.json"
course_json = "data/course_material.json"

test_gen_obj = testGenerator(pro_json, course_json)
test_qa = test_gen_obj.create_test()
print(test_qa)