const Course = require('../models/courseModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

// GET /api/courses
const list = async (req, res) => {
  const courses = await Course.find({}).sort({createdAt: -1});
  const camelCased = courses.map((course) => toCamelCase(course.toObject()));

  res.status(200).json(camelCased);
}

// GET /api/courses/:id
const get = async (req, res) => {
  const {id}  = req.params;

  if (!validId(id)) {
    res.status(400).json({error: `${id} is not a valid course id.`});
    return;
  }

  const course = await Course.findById(id);

  if (!course) {
    res.status(404).json({error: `Course with id ${id} was not found.`});
    return;
  }

  // Fetch users, enrolled to this course
  const users = await User.find({'_id': { $in: course.enrolled}}).select('-password -createdAt -updatedAt');

  res.status(200).json(toCamelCase({...course.toObject(), enrolled: users}));
}

// DELETE /api/courses/:id
const remove = async (req, res) => {
  const {id} = req.params;

  if (!validId(id)) {
    res.status(400).json({error: `${id} is not a valid course id.`});
    return;
  }

  const course = await Course.findOneAndDelete({_id: id})

  if(!course) {
    res.status(404).json({error: `Course with id ${id} was not found.`});
    return;
  }

  res.status(200).json(toCamelCase(course.toObject()));
}

// POST /api/courses
const create = async (req, res) => {
  let {title,
    providerId,
    description,
    shortDescription,
    level,
    price,
    imageUrl,
    maxStudents,
    startDate,
    endDate,
    startTime,
    endTime} = req.body;

  // Validate presence of data
  // if (!title || !description || !shortDescription || !level) {
  //   res.status(400).json({error: "Course must have title, description, shortDescription and level properties."});
  //   return;
  // }
  if (!title) {
    res.status(400).json({error: "Course must have a title."});
    return;
  }

  // Validate data types
  try {
    if (price) { price = parseFloat(price); }
  } catch(err) {
    res.status(400).json({error: `Failed to convert price/maxStudents/startTime/endTime into a number. Error: ${err}`});
    return;
  }

  try {
    if (startDate && typeof startDate === "string") { startDate = new Date(JSON.parse(startDate)); }
    if (endDate && typeof endDate === "string") { endDate = new Date(JSON.parse(endDate)); }
  } catch(err) {
    res.status(400).json({error: `Failed to convert startDate/endDate to date. Error: ${err}`});
    return;
  }

  if (providerId && !validId(providerId)) {
    res.status(400).json({error: `${providerId} is not valid value for providerId.`});
    return;
  }

  // Save to the database
  try {
    const payload = toUnderscoreCase({
      title,
      providerId,
      description,
      shortDescription,
      level,
      price,
      imageUrl,
      maxStudents,
      startDate,
      endDate,
      startTime,
      endTime
    });

    payload.enrolled = [];

    const course = await Course.create(payload);
    res.status(200).json(toCamelCase(course.toObject()));
  } catch (err) {
    res.status(500).json({error: `Failed to save new course. Error: ${err}`});
  }
}

// PATCH /api/courses/:id
const update = async (req, res) => {
  const {id} = req.params;

  let {title,
    providerId,
    description,
    shortDescription,
    level,
    price,
    imageUrl,
    maxStudents,
    startDate,
    endDate,
    startTime,
    endTime} = req.body;

  // Validate data types
  try {
    if (price) { price = parseFloat(price); }
  } catch(err) {
    res.status(400).json({error: `Failed to convert price/maxStudents/startTime/endTime into a number. Error: ${err}`});
    return;
  }

  try {
    if (startDate && typeof startDate === "string") { startDate = new Date(startDate); }
    if (endDate && typeof endDate === "string") { endDate = new Date(endDate); }

  } catch(err) {
    res.status(400).json({error: `Failed to convert startDate/endDate to date. Error: ${err}`});
    return;
  }

  if (providerId && !validId(providerId)) {
    res.status(400).json({error: `${providerId} is not valid value for providerId.`});
    return;
  }

  if (!validId(id)) {
    res.status(400).json({error: `${id} is not a valid course id.`});
    return;
  }

  // Update course
  try {
    const payload = toUnderscoreCase({
      title,
      providerId,
      description,
      shortDescription,
      level,
      price,
      imageUrl,
      maxStudents,
      startDate,
      endDate,
      startTime,
      endTime
    });

    const course = await Course.findOneAndUpdate({_id: id}, payload, {new: true});

    if (!course) {
      res.status(404).json({error: `Course with id ${id} was not found.`});
      return;
    }

    res.status(200).json(toCamelCase(course.toObject()));
  } catch (err) {
    res.status(500).json({error: `Failed to save updates to the course. Error: ${err}`});
  }
}

const validId = (id) => {
  ObjectId = mongoose.Types.ObjectId;

  if (ObjectId.isValid(id)) {
    if (String(new ObjectId(id)) === id) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

const toUnderscoreCase = (obj) => {
  const res = {};

  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== '') {
      const underscored = key.replace(/(?:^|\.?)([A-Z])/g, (x,y) => ("_" + y.toLowerCase())).replace(/^_/, "");
      res[underscored] = val;
    }
  }

  return res;
}

const toCamelCase = (obj) => {
  const res = {};

  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== '') {
      const camelCased = key.replace(/_([a-z])/g, (g) => (g[1].toUpperCase()));
      res[camelCased] = val;
    }
  }

  return res;
}

//enroll
const enroll = async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user._id;

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({ error: "Course not found" });
  }

  if (course.enrolled.includes(userId)) {
    return res.status(400).json({ error: "You have already enrolled in this course" });
  }

  course.enrolled.push(userId);
  await course.save();

  res.status(200).json({ message: "Successfully enrolled" });
}

//check if user is enrolled
const isEnrolled = async (req, res) => {
  try {
    const { id: courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
  
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
  
    const isEnrolled = course.enrolled.includes(userId);
    
    res.status(200).json({ isEnrolled });

  } catch (err) {
    if (err.name === 'CastError') {
      console.error("Invalid course ID provided");  
      return res.status(400).json({ error: "Invalid course ID" });
    }
    console.error(err);  // For other errors, show the full stack trace
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// DELETE /api/courses/enroll/:id
const cancelEnrollment = async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user._id;

  if (!courseId) {
    res.status(400).json({error: 'Please, provide course id in request params.'});
    return;
  }

  const course = await Course.findById(courseId);

  if (!course) {
    res.status(400).json({error: `Course with id ${courseId} was not found.`});
    return;
  }

  const index = course.enrolled.indexOf(userId);

  if (index === -1) {
    res.status(400).json({error: 'User is not enrolled to this course'});
    return;
  }

  course.enrolled.splice(index, 1);

  try {
    await course.save();
    res.status(200).json({message: 'Successfully cancelled enrollment.'})
  } catch(err) {
    res.status(500).json({error: `Failed to save to the database. Error: ${err}`});
  }
}

const myCourses = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;
    let courses;

    // If user is regular customer - fetch courses he has enrolled to
    if (role == 0) {
      courses = await Course.find({enrolled: userId});
    } else if (role == 1) {
      // If user is teacher - fetch courses he has published
      courses = await Course.find({provider_id: userId});
    } else {
      res.status(400).json({error: `User role is not specified or invalid: ${role}`});
      return;
    }

    const camelCased = courses.map((course) => toCamelCase(course.toObject()));

    res.status(200).json(camelCased);
  } catch (err) {
    res.status(500).json({ error: `Failed to fetch courses. Error: ${err}` });
  }
};


module.exports = {
  list,
  get,
  create,
  delete: remove,
  update,
  enroll,
  isEnrolled,
  myCourses,
  cancelEnrollment
}